'use strict';

const User = require('../models/User');
const Listing = require('../models/Listing');
const { notifyAdminNewSubscription } = require('../services/notificationService');

/**
 * POST /api/subscriptions
 * Activate premium subscription for a broker.
 * Requirements: 15.1, 15.2
 */
async function subscribe(req, res, next) {
  try {
    const { plan, paymentMethod } = req.body;
    if (!plan || !paymentMethod) {
      return res.status(422).json({ success: false, message: 'plan and paymentMethod are required.' });
    }

    if (req.user.role !== 'broker') {
      return res.status(403).json({ success: false, message: 'Only brokers can subscribe.' });
    }

    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + 1);

    await User.findByIdAndUpdate(req.user._id, {
      'premiumSubscription.isActive': true,
      'premiumSubscription.plan': plan,
      'premiumSubscription.startDate': new Date(),
      'premiumSubscription.renewalDate': renewalDate,
      'premiumSubscription.paymentMethod': paymentMethod,
      'premiumSubscription.cancelAtRenewal': false,
    });

    const user = await User.findById(req.user._id).lean();

    // Notify admins of the new broker subscription
    await notifyAdminNewSubscription(req.app, {
      userId: user._id.toString(),
      fullName: user.fullName,
      plan,
      paymentMethod,
    });

    return res.status(201).json({ success: true, subscription: user.premiumSubscription });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/subscriptions
 * Cancel subscription — must be ≥ 24h before renewal.
 * Requirements: 15.4
 */
async function cancelSubscription(req, res, next) {
  try {
    const user = await User.findById(req.user._id).lean();
    const sub = user.premiumSubscription;

    if (!sub || !sub.isActive) {
      return res.status(422).json({ success: false, message: 'No active subscription.' });
    }

    const hoursUntilRenewal = (new Date(sub.renewalDate) - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilRenewal < 24) {
      return res.status(422).json({
        success: false,
        message: 'Cancellation must be at least 24 hours before renewal date.',
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      'premiumSubscription.cancelAtRenewal': true,
    });

    return res.json({ success: true, message: 'Subscription will not renew. Access retained until period end.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/subscriptions
 * Get current subscription status.
 * Requirements: 15.1
 */
async function getSubscription(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('premiumSubscription').lean();
    return res.json({ success: true, subscription: user.premiumSubscription });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/listings/:id/feature
 * Feature a listing (requires active subscription, max 5 featured).
 * Requirements: 16.1, 16.3
 */
async function featureListing(req, res, next) {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user.premiumSubscription || !user.premiumSubscription.isActive) {
      return res.status(403).json({ success: false, message: 'Active subscription required to feature listings.' });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }
    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: not the owner.' });
    }

    if (!listing.isFeatured) {
      // Count currently featured listings for this user
      const featuredCount = await Listing.countDocuments({
        owner: req.user._id,
        isFeatured: true,
        status: 'active',
      });
      if (featuredCount >= 5) {
        return res.status(422).json({ success: false, message: 'Maximum 5 featured listings allowed.' });
      }
    }

    listing.isFeatured = !listing.isFeatured;
    await listing.save();

    return res.json({ success: true, listing });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/listings
 * Per-listing analytics for active-subscription brokers.
 * Requirements: 17.1, 17.2, 17.3
 */
async function getListingAnalytics(req, res, next) {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user.premiumSubscription || !user.premiumSubscription.isActive) {
      return res.status(403).json({ success: false, message: 'Active subscription required.' });
    }

    const listings = await Listing.find({ owner: req.user._id })
      .select('title viewCount isFeatured status createdAt')
      .lean();

    return res.json({ success: true, analytics: listings });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/aggregate
 * Aggregate analytics for active-subscription brokers.
 * Requirements: 17.1, 17.2, 17.3
 */
async function getAggregateAnalytics(req, res, next) {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user.premiumSubscription || !user.premiumSubscription.isActive) {
      return res.status(403).json({ success: false, message: 'Active subscription required.' });
    }

    const [totalListings, activeListings, totalViews] = await Promise.all([
      Listing.countDocuments({ owner: req.user._id }),
      Listing.countDocuments({ owner: req.user._id, status: 'active' }),
      Listing.aggregate([
        { $match: { owner: req.user._id } },
        { $group: { _id: null, totalViews: { $sum: '$viewCount' } } },
      ]),
    ]);

    return res.json({
      success: true,
      analytics: {
        totalListings,
        activeListings,
        totalViews: totalViews[0]?.totalViews || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  subscribe,
  cancelSubscription,
  getSubscription,
  featureListing,
  getListingAnalytics,
  getAggregateAnalytics,
};
