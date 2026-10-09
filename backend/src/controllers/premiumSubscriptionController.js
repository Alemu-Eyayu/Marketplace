'use strict';

const axios = require('axios');
const cloudinary = require('../config/cloudinary');
const PremiumSubscription = require('../models/PremiumSubscription');
const User = require('../models/User');
const { createNotification, notifyAdmins } = require('../services/notificationService');

const {
  PRICE_TABLE,
  CATEGORY_PRICE_LEVEL,
  ROLE_TIER,
  ROLE_ALLOWED_CATEGORIES,
} = PremiumSubscription;

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_BASE_URL   = 'https://api.chapa.co/v1';

// ── Helper: initialize Chapa transaction ──────────────────────────────────────
async function initializeChapaTransaction({ amount, currency = 'ETB', email, firstName, lastName, txRef, returnUrl, callbackUrl, title, description }) {
  const response = await axios.post(
    `${CHAPA_BASE_URL}/transaction/initialize`,
    {
      amount,
      currency,
      email,
      first_name: firstName,
      last_name:  lastName,
      tx_ref:     txRef,
      return_url: returnUrl,
      callback_url: callbackUrl,
      customization: { title, description },
    },
    {
      headers: {
        Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

// ── Helper: verify Chapa transaction ─────────────────────────────────────────
async function verifyChapaTransaction(txRef) {
  const response = await axios.get(
    `${CHAPA_BASE_URL}/transaction/verify/${txRef}`,
    {
      headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` },
    }
  );
  return response.data;
}

// ── Helper: upload receipt buffer to Cloudinary ────────────────────────────────
function uploadReceipt(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

// ── GET /api/premium-subscriptions/pricing ────────────────────────────────────
// Returns the full pricing table and category levels (public)
async function getPricing(req, res) {
  return res.json({
    success: true,
    priceTable: PRICE_TABLE,
    categoryPriceLevel: CATEGORY_PRICE_LEVEL,
    roleTier: ROLE_TIER,
    roleAllowedCategories: ROLE_ALLOWED_CATEGORIES,
  });
}

// ── POST /api/premium-subscriptions ───────────────────────────────────────────
// Subscriber submits a new subscription request with receipt
async function submitRequest(req, res, next) {
  try {
    const { categorySlug, duration, paymentMethod } = req.body;
    const role = req.user.role;

    // Validate role
    if (!['user', 'broker', 'company'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Admins do not need subscriptions.' });
    }

    // Validate category access for role
    const allowed = ROLE_ALLOWED_CATEGORIES[role] || [];
    if (!allowed.includes(categorySlug)) {
      return res.status(403).json({
        success: false,
        message: `Your role (${role}) cannot subscribe to the "${categorySlug}" category.`,
      });
    }

    // Validate duration and payment method
    if (!['monthly', 'yearly'].includes(duration)) {
      return res.status(422).json({ success: false, message: 'duration must be monthly or yearly.' });
    }
    if (!['cbe', 'telebirr', 'mpesa'].includes(paymentMethod)) {
      return res.status(422).json({ success: false, message: 'paymentMethod must be cbe, telebirr, or mpesa.' });
    }

    // Check for existing pending or active subscription for same category
    const existing = await PremiumSubscription.findOne({
      user: req.user._id,
      categorySlug,
      status: { $in: ['pending', 'active'] },
    }).lean();

    if (existing) {
      const msg = existing.status === 'pending'
        ? 'You already have a pending subscription request for this category.'
        : 'You already have an active subscription for this category.';
      return res.status(409).json({ success: false, message: msg });
    }

    // Validate receipt file
    const file = req.file;
    if (!file) {
      return res.status(422).json({ success: false, message: 'Receipt file is required.' });
    }
    if (file.size > 10 * 1024 * 1024) {
      return res.status(422).json({ success: false, message: 'Receipt file must be 10 MB or less.' });
    }
    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      return res.status(422).json({ success: false, message: 'Receipt must be JPEG, PNG, or PDF.' });
    }

    // Upload receipt to Cloudinary
    let receiptUrl;
    try {
      const result = await uploadReceipt(file.buffer, {
        folder: 'ethiogebiya/receipts',
        resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
      });
      receiptUrl = result.secure_url;
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Receipt upload failed. Please try again.' });
    }

    // Compute fee
    const tier = ROLE_TIER[role];
    const level = CATEGORY_PRICE_LEVEL[categorySlug] || 'medium';
    const fee = PRICE_TABLE[tier][level][duration];

    // Create subscription request
    const sub = await PremiumSubscription.create({
      user: req.user._id,
      categorySlug,
      duration,
      paymentMethod,
      receiptUrl,
      fee,
      status: 'pending',
    });

    // Notify all admins
    const user = await User.findById(req.user._id).select('fullName role').lean();
    await notifyAdmins(req.app, {
      type: 'subscription_request',
      title: 'New Subscription Request',
      body: `${user.fullName} (${role}) submitted a ${duration} subscription for "${categorySlug}" via ${paymentMethod}. Fee: ${fee} ETB.`,
      relatedId: sub._id.toString(),
      relatedModel: 'PremiumSubscription',
    });

    return res.status(201).json({ success: true, subscription: sub });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/premium-subscriptions/my ─────────────────────────────────────────
// Subscriber views their own subscriptions
async function getMySubscriptions(req, res, next) {
  try {
    const subs = await PremiumSubscription.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, subscriptions: subs });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/premium-subscriptions/admin ──────────────────────────────────────
// Admin views all pending requests (paginated)
async function getAdminQueue(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const skip  = (page - 1) * limit;
    const statusFilter = req.query.status || 'pending';

    const query = statusFilter === 'all' ? {} : { status: statusFilter };

    const [subs, total] = await Promise.all([
      PremiumSubscription.find(query)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'fullName phone role profilePhoto')
        .lean(),
      PremiumSubscription.countDocuments(query),
    ]);

    return res.json({
      success: true,
      subscriptions: subs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/premium-subscriptions/:id/activate ─────────────────────────────
// Admin activates a pending subscription request
async function activateSubscription(req, res, next) {
  try {
    const sub = await PremiumSubscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription request not found.' });

    if (sub.status !== 'pending') {
      return res.status(422).json({ success: false, message: 'Only pending requests can be activated.' });
    }

    const startDate  = new Date();
    const expiryDate = new Date(startDate);
    if (sub.duration === 'monthly') {
      expiryDate.setDate(expiryDate.getDate() + 30);
    } else {
      expiryDate.setDate(expiryDate.getDate() + 365);
    }

    sub.status      = 'active';
    sub.startDate   = startDate;
    sub.expiryDate  = expiryDate;
    sub.activatedBy = req.user._id;
    sub.activatedAt = startDate;
    await sub.save();

    // Notify subscriber
    try {
      await createNotification(req.app, {
        recipientId: sub.user.toString(),
        type: 'subscription_activated',
        title: 'Subscription Activated',
        body: `Your ${sub.duration} subscription for "${sub.categorySlug}" has been activated. Valid until ${expiryDate.toLocaleDateString()}.`,
        relatedId: sub._id.toString(),
        relatedModel: 'PremiumSubscription',
      });
    } catch (e) {
      console.error('[premiumSub] notify subscriber error:', e.message);
    }

    return res.json({ success: true, subscription: sub });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/premium-subscriptions/:id/deactivate ───────────────────────────
// Admin deactivates an active subscription
async function deactivateSubscription(req, res, next) {
  try {
    const sub = await PremiumSubscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found.' });

    if (sub.status !== 'active') {
      return res.status(422).json({ success: false, message: 'Only active subscriptions can be deactivated.' });
    }

    sub.status        = 'inactive';
    sub.deactivatedBy = req.user._id;
    sub.deactivatedAt = new Date();
    await sub.save();

    // Notify subscriber
    try {
      await createNotification(req.app, {
        recipientId: sub.user.toString(),
        type: 'subscription_deactivated',
        title: 'Subscription Deactivated',
        body: `Your subscription for "${sub.categorySlug}" has been deactivated by an admin. You can no longer post in this category.`,
        relatedId: sub._id.toString(),
        relatedModel: 'PremiumSubscription',
      });
    } catch (e) {
      console.error('[premiumSub] notify subscriber error:', e.message);
    }

    return res.json({ success: true, subscription: sub });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/premium-subscriptions/:id/reject ───────────────────────────────
// Admin rejects a pending subscription request
async function rejectSubscription(req, res, next) {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(422).json({ success: false, message: 'Rejection reason is required.' });
    }

    const sub = await PremiumSubscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription request not found.' });

    if (sub.status !== 'pending') {
      return res.status(422).json({ success: false, message: 'Only pending requests can be rejected.' });
    }

    sub.status          = 'inactive';
    sub.rejectedBy      = req.user._id;
    sub.rejectedAt      = new Date();
    sub.rejectionReason = reason;
    await sub.save();

    // Notify subscriber
    try {
      await createNotification(req.app, {
        recipientId: sub.user.toString(),
        type: 'subscription_rejected',
        title: 'Subscription Request Rejected',
        body: `Your subscription request for "${sub.categorySlug}" was rejected. Reason: ${reason}. Please resubmit with correct payment proof.`,
        relatedId: sub._id.toString(),
        relatedModel: 'PremiumSubscription',
      });
    } catch (e) {
      console.error('[premiumSub] notify subscriber error:', e.message);
    }

    return res.json({ success: true, subscription: sub });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/premium-subscriptions/:id ────────────────────────────────────────
// Get single subscription (admin or owner)
async function getSubscriptionById(req, res, next) {
  try {
    const sub = await PremiumSubscription.findById(req.params.id)
      .populate('user', 'fullName phone role profilePhoto')
      .lean();
    if (!sub) return res.status(404).json({ success: false, message: 'Not found.' });

    // Only admin or the owner can view
    const isAdmin = req.user.role === 'admin';
    const isOwner = sub.user._id.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    return res.json({ success: true, subscription: sub });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/premium-subscriptions/chapa/initialize ─────────────────────────
// Initialize a Chapa payment for a subscription
async function initializeChapa(req, res, next) {
  try {
    const { categorySlug, duration } = req.body;
    const role = req.user.role;

    if (!['user', 'broker', 'company'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Admins do not need subscriptions.' });
    }

    const allowed = ROLE_ALLOWED_CATEGORIES[role] || [];
    if (!allowed.includes(categorySlug)) {
      return res.status(403).json({ success: false, message: `Your role cannot subscribe to "${categorySlug}".` });
    }

    if (!['monthly', 'yearly'].includes(duration)) {
      return res.status(422).json({ success: false, message: 'duration must be monthly or yearly.' });
    }

    // Check for existing pending or active subscription
    const existing = await PremiumSubscription.findOne({
      user: req.user._id,
      categorySlug,
      status: { $in: ['pending', 'active'] },
    }).lean();

    if (existing) {
      const msg = existing.status === 'pending'
        ? 'You already have a pending subscription request for this category.'
        : 'You already have an active subscription for this category.';
      return res.status(409).json({ success: false, message: msg });
    }

    // Compute fee
    const tier  = ROLE_TIER[role];
    const level = CATEGORY_PRICE_LEVEL[categorySlug] || 'medium';
    const fee   = PRICE_TABLE[tier][level][duration];

    // Get user details for Chapa
    const user = await User.findById(req.user._id).select('fullName phone email').lean();
    const nameParts = (user.fullName || 'User').split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName  = nameParts.slice(1).join(' ') || 'Account';

    // Generate unique tx_ref (alphanumeric only — Chapa requirement)
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const txRef = `sub${req.user._id}${Date.now()}${randomSuffix}`;

    // Chapa requires a real-looking email domain (rejects custom domains)
    // Since users register by phone, use a gmail.com placeholder
    const shortId = req.user._id.toString().slice(-10);
    const userEmail = `ethiogebiya${shortId}@gmail.com`;

    const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!CHAPA_SECRET_KEY) {
      return res.status(503).json({ success: false, message: 'Payment gateway not configured. Please contact support.' });
    }

    let chapaRes;
    try {
      chapaRes = await initializeChapaTransaction({
        amount:      fee,
        currency:    'ETB',
        email:       userEmail,
        firstName,
        lastName,
        txRef,
        returnUrl:   `${appUrl}/premium-subscription/verify?tx_ref=${txRef}`,
        callbackUrl: `${process.env.BACKEND_URL || process.env.CLIENT_ORIGIN?.replace(':5173', ':5000') || 'http://localhost:5000'}/api/premium-subscriptions/chapa/callback`,
        title:       'EthioGebiya Sub',
        description: `${duration} - ${categorySlug}`,
      });
      console.log('[chapa init] Chapa response status:', chapaRes.status);
    } catch (chapaErr) {
      const rawMsg = chapaErr.response?.data?.message || chapaErr.response?.data?.error || chapaErr.message;
      const chapaMsg = typeof rawMsg === 'object' ? JSON.stringify(rawMsg) : rawMsg;
      console.error('[chapa init] Chapa API error status:', chapaErr.response?.status);
      console.error('[chapa init] Chapa API error body:', JSON.stringify(chapaErr.response?.data));
      return res.status(502).json({
        success: false,
        message: `Payment gateway error: ${chapaMsg || 'Please try again.'}`,
      });
    }

    if (chapaRes.status !== 'success') {
      console.error('[chapa init] Unexpected Chapa status:', JSON.stringify(chapaRes));
      return res.status(502).json({ success: false, message: 'Failed to initialize payment. Please try again.' });
    }

    // Store pending subscription with txRef for later verification
    await PremiumSubscription.create({
      user:          req.user._id,
      categorySlug,
      duration,
      paymentMethod: 'chapa',
      receiptUrl:    '',       // will be updated after verification
      fee,
      status:        'pending',
      txRef,
    });

    return res.json({
      success:      true,
      checkoutUrl:  chapaRes.data.checkout_url,
      txRef,
    });
  } catch (err) {
    console.error('[chapa init] Unexpected error:', err.message);
    next(err);
  }
}

// ── POST /api/premium-subscriptions/chapa/callback ───────────────────────────
// Chapa webhook callback (server-to-server)
async function chapaCallback(req, res) {
  try {
    const { tx_ref, status } = req.body;
    if (!tx_ref) return res.status(400).json({ success: false });

    if (status === 'success') {
      // Verify with Chapa API
      const verification = await verifyChapaTransaction(tx_ref);
      if (verification.status === 'success' && verification.data?.status === 'success') {
        const sub = await PremiumSubscription.findOne({ txRef: tx_ref });
        if (sub && sub.status === 'pending') {
          sub.receiptUrl = `chapa:${tx_ref}`; // mark as chapa-verified
          await sub.save();
          // Notify admins
          const user = await User.findById(sub.user).select('fullName role').lean();
          // Use a minimal app reference for notifications
          await notifyAdmins(null, {
            type: 'subscription_request',
            title: 'New Subscription Request (Chapa Verified)',
            body: `${user?.fullName} (${user?.role}) paid ${sub.fee} ETB for "${sub.categorySlug}" (${sub.duration}) via Chapa.`,
            relatedId: sub._id.toString(),
            relatedModel: 'PremiumSubscription',
          });
        }
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('[chapa callback]', err.message);
    return res.json({ success: true }); // always 200 to Chapa
  }
}

// ── GET /api/premium-subscriptions/chapa/verify ──────────────────────────────
// Frontend calls this after redirect from Chapa checkout
async function verifyChapa(req, res, next) {
  try {
    const { tx_ref } = req.query;
    if (!tx_ref) return res.status(422).json({ success: false, message: 'tx_ref is required.' });

    const verification = await verifyChapaTransaction(tx_ref);

    if (verification.status === 'success' && verification.data?.status === 'success') {
      // Update subscription record
      const sub = await PremiumSubscription.findOneAndUpdate(
        { txRef: tx_ref, user: req.user._id },
        { receiptUrl: `chapa:${tx_ref}` },
        { new: true }
      );

      if (!sub) {
        return res.status(404).json({ success: false, message: 'Subscription record not found.' });
      }

      // Notify admins with app context
      const user = await User.findById(req.user._id).select('fullName role').lean();
      await notifyAdmins(req.app, {
        type: 'subscription_request',
        title: 'New Subscription Request (Chapa Verified)',
        body: `${user.fullName} (${user.role}) paid ${sub.fee} ETB for "${sub.categorySlug}" (${sub.duration}) via Chapa. Please activate.`,
        relatedId: sub._id.toString(),
        relatedModel: 'PremiumSubscription',
      });

      return res.json({ success: true, status: 'paid', subscription: sub });
    } else {
      return res.json({ success: false, status: 'failed', message: 'Payment not completed.' });
    }
  } catch (err) {
    console.error('[chapa verify]', err.response?.data || err.message);
    next(err);
  }
}

module.exports = {
  getPricing,
  submitRequest,
  getMySubscriptions,
  getAdminQueue,
  activateSubscription,
  deactivateSubscription,
  rejectSubscription,
  getSubscriptionById,
  initializeChapa,
  chapaCallback,
  verifyChapa,
};
