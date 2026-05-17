'use strict';

const cron = require('node-cron');
const Listing = require('../models/Listing');
const User = require('../models/User');
const Company = require('../models/Company');
const Notification = require('../models/Notification');
const PremiumSubscription = require('../models/PremiumSubscription');

/**
 * Mark expired listings, send 3-day warnings.
 * Requirements: 8.6, 11.4
 */
async function runExpiryJob(app) {
  const now = new Date();

  // Expire listings past their expiresAt
  const expiredListings = await Listing.find({
    status: 'active',
    expiresAt: { $lt: now },
  }).lean();

  if (expiredListings.length > 0) {
    const ids = expiredListings.map((l) => l._id);
    await Listing.updateMany({ _id: { $in: ids } }, { $set: { status: 'expired' } });

    const notifications = expiredListings.map((l) => ({
      recipient: l.owner,
      type: 'listing_expired',
      title: 'Listing Expired',
      body: `Your listing "${l.title}" has expired.`,
      relatedId: l._id,
      relatedModel: 'Listing',
    }));
    await Notification.insertMany(notifications);

    // Emit real-time notifications
    const io = app && app.get('io');
    if (io) {
      for (const l of expiredListings) {
        io.to(`user:${l.owner}`).emit('notification:new', {
          type: 'listing_expired',
          title: 'Listing Expired',
          body: `Your listing "${l.title}" has expired.`,
        });
      }
    }

    console.log(`[expiryJob] Expired ${expiredListings.length} listing(s).`);
  }

  // 3-day expiry warnings (Req 11.4)
  const warningDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const warningStart = new Date(warningDate);
  warningStart.setHours(0, 0, 0, 0);
  const warningEnd = new Date(warningDate);
  warningEnd.setHours(23, 59, 59, 999);

  const expiringListings = await Listing.find({
    status: 'active',
    expiresAt: { $gte: warningStart, $lte: warningEnd },
  }).lean();

  if (expiringListings.length > 0) {
    const warnings = expiringListings.map((l) => ({
      recipient: l.owner,
      type: 'listing_expiry_warning',
      title: 'Listing Expiring Soon',
      body: `Your listing "${l.title}" expires in 3 days. Renew it to keep it active.`,
      relatedId: l._id,
      relatedModel: 'Listing',
    }));
    await Notification.insertMany(warnings);
    console.log(`[expiryJob] Sent ${expiringListings.length} expiry warning(s).`);
  }

  // Subscription renewal (Req 15.5, 15.6)
  const dueForRenewal = await User.find({
    'premiumSubscription.isActive': true,
    'premiumSubscription.renewalDate': { $lte: now },
  }).lean();

  for (const user of dueForRenewal) {
    const sub = user.premiumSubscription;
    if (sub.cancelAtRenewal) {
      // Downgrade — deactivate subscription and unfeature listings
      await User.findByIdAndUpdate(user._id, {
        'premiumSubscription.isActive': false,
      });
      await Listing.updateMany({ owner: user._id, isFeatured: true }, { $set: { isFeatured: false } });
      await Notification.create({
        recipient: user._id,
        type: 'subscription_cancelled',
        title: 'Subscription Ended',
        body: 'Your premium subscription has ended.',
      });
      console.log(`[expiryJob] Subscription cancelled for user ${user._id}.`);
    } else {
      // Auto-renew — extend renewal date by 1 month
      const newRenewal = new Date(sub.renewalDate);
      newRenewal.setMonth(newRenewal.getMonth() + 1);
      await User.findByIdAndUpdate(user._id, {
        'premiumSubscription.renewalDate': newRenewal,
      });
      console.log(`[expiryJob] Subscription renewed for user ${user._id}.`);
    }
  }

  // Company subscription expiry — remove featured flags (Req 10.3)
  const expiredCompanies = await Company.find({
    'subscription.isActive': true,
    'subscription.renewalDate': { $lte: now },
  }).lean();

  for (const company of expiredCompanies) {
    const sub = company.subscription;
    if (sub.cancelAtRenewal) {
      // Deactivate subscription and unfeature all company listings
      await Company.findByIdAndUpdate(company._id, { 'subscription.isActive': false });
      await Listing.updateMany(
        { companyOwner: company._id, isFeatured: true },
        { $set: { isFeatured: false } },
      );
      await Notification.create({
        recipient: company.adminUser,
        type: 'company_subscription_expired',
        title: 'Company Subscription Ended',
        body: 'Your company subscription has ended. Featured listings have been removed.',
      });
      console.log(`[expiryJob] Company subscription cancelled for company ${company._id}.`);
    } else {
      // Auto-renew — extend renewal date by 1 month
      const newRenewal = new Date(sub.renewalDate);
      newRenewal.setMonth(newRenewal.getMonth() + 1);
      await Company.findByIdAndUpdate(company._id, { 'subscription.renewalDate': newRenewal });
      console.log(`[expiryJob] Company subscription renewed for company ${company._id}.`);
    }
  }
}

/**
 * Start the daily expiry cron job (runs at midnight every day).
 */
function startExpiryJob(app) {
  cron.schedule('0 0 * * *', () => {
    runExpiryJob(app).catch((err) => console.error('[expiryJob] Error:', err));
  });

  // Also run premium subscription expiry every hour
  cron.schedule('0 * * * *', () => {
    runPremiumSubExpiryJob(app).catch((err) => console.error('[premiumSubExpiry] Error:', err));
  });

  console.log('[expiryJob] Scheduled daily expiry check at midnight.');
}

/**
 * Expire premium subscriptions and send notifications.
 */
async function runPremiumSubExpiryJob(app) {
  const now = new Date();
  const io = app && app.get('io');

  // Mark expired active subscriptions
  const expired = await PremiumSubscription.find({
    status: 'active',
    expiryDate: { $lt: now },
    expiryNotified: false,
  }).lean();

  for (const sub of expired) {
    await PremiumSubscription.findByIdAndUpdate(sub._id, {
      status: 'expired',
      expiryNotified: true,
    });

    const notif = await Notification.create({
      recipient: sub.user,
      type: 'subscription_expired',
      title: 'Subscription Expired',
      body: `Your ${sub.duration} subscription for "${sub.categorySlug}" has expired. Renew to continue posting.`,
      relatedId: sub._id,
      relatedModel: 'PremiumSubscription',
    });

    if (io) io.to(`user:${sub.user}`).emit('notification:new', notif);
  }

  if (expired.length > 0) {
    console.log(`[premiumSubExpiry] Expired ${expired.length} subscription(s).`);
  }

  // 7-day renewal reminders
  const reminderDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const reminders = await PremiumSubscription.find({
    status: 'active',
    expiryDate: { $gte: now, $lte: reminderDate },
    reminderNotified: false,
  }).lean();

  for (const sub of reminders) {
    await PremiumSubscription.findByIdAndUpdate(sub._id, { reminderNotified: true });

    const notif = await Notification.create({
      recipient: sub.user,
      type: 'subscription_expiry_reminder',
      title: 'Subscription Expiring Soon',
      body: `Your ${sub.duration} subscription for "${sub.categorySlug}" expires on ${new Date(sub.expiryDate).toLocaleDateString()}. Renew now to avoid interruption.`,
      relatedId: sub._id,
      relatedModel: 'PremiumSubscription',
    });

    if (io) io.to(`user:${sub.user}`).emit('notification:new', notif);
  }

  if (reminders.length > 0) {
    console.log(`[premiumSubExpiry] Sent ${reminders.length} renewal reminder(s).`);
  }
}

module.exports = { startExpiryJob };
