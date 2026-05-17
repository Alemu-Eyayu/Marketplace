'use strict';

const User = require('../models/User');
const Listing = require('../models/Listing');
const ModerationReport = require('../models/ModerationReport');
const Category = require('../models/Category');
const getRedisClient = require('../config/redis');
const { notifyVerificationStatus } = require('../services/notificationService');
const { extractPublicId } = require('../utils/cloudinaryUtils');

// ── User Management ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Search users by phone/name/ID, paginated.
 */
async function listUsers(req, res, next) {
  try {
    const { q, page: pageRaw, limit: limitRaw } = req.query;
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (q) {
      query.$or = [
        { phone: { $regex: q, $options: 'i' } },
        { fullName: { $regex: q, $options: 'i' } },
      ];
      if (/^[a-f\d]{24}$/i.test(q)) {
        query.$or.push({ _id: q });
      }
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.json({ success: true, users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/users/:id/suspend
 * Suspend user and revoke all sessions.
 */
async function suspendUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.isActive = false;
    await user.save();

    const redis = getRedisClient();
    // Refresh token is stored as `refresh:{userId}` (exact key, no wildcard needed)
    const key = `refresh:${req.params.id}`;
    await redis.del(key);

    return res.json({ success: true, message: 'User suspended.' });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/users/:id/reinstate
 * Reinstate a suspended user.
 */
async function reinstateUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { returnDocument: 'after' },
    ).select('-passwordHash').lean();

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/users/:id
 * Hard-delete a user and all their associated data.
 * Removes: User, Listings (+ Cloudinary assets), Conversations, Messages,
 *          Notifications, SavedSearches, PremiumSubscriptions, CompanyMemberships,
 *          ActivityLogs, ModerationReports filed by them.
 * Transactions are anonymised (buyer/seller refs nulled) to preserve financial records.
 */
async function deleteUser(req, res, next) {
  try {
    const Listing = require('../models/Listing');
    const Conversation = require('../models/Conversation');
    const Message = require('../models/Message');
    const Notification = require('../models/Notification');
    const SavedSearch = require('../models/SavedSearch');
    const PremiumSubscription = require('../models/PremiumSubscription');
    const CompanyMember = require('../models/CompanyMember');
    const ActivityLog = require('../models/ActivityLog');
    const ModerationReport = require('../models/ModerationReport');
    const cloudinary = require('../config/cloudinary');

    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Prevent deleting another admin
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete an admin account.' });
    }

    // 1. Delete user's listings + Cloudinary assets
    const listings = await Listing.find({ owner: userId }).lean();
    const cloudinaryDeletes = [];
    for (const listing of listings) {
      const assetUrls = [...(listing.images || [])];
      if (listing.video) assetUrls.push(listing.video);
      for (const url of assetUrls) {
        try {
          const parts = url.split('/upload/');
          if (parts.length >= 2) {
            const publicId = parts[1].replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '');
            const resourceType = url === listing.video ? 'video' : 'image';
            cloudinaryDeletes.push(cloudinary.uploader.destroy(publicId, { resource_type: resourceType }));
          }
        } catch (_) { /* best-effort */ }
      }
    }
    await Promise.allSettled(cloudinaryDeletes);
    await Listing.deleteMany({ owner: userId });

    // 2. Delete conversations the user participated in + their messages
    const conversations = await Conversation.find({ participants: userId }).select('_id').lean();
    const convIds = conversations.map((c) => c._id);
    await Message.deleteMany({ conversation: { $in: convIds } });
    await Conversation.deleteMany({ _id: { $in: convIds } });

    // 3. Delete notifications
    await Notification.deleteMany({ recipient: userId });

    // 4. Delete saved searches
    await SavedSearch.deleteMany({ user: userId });

    // 5. Delete premium subscriptions
    await PremiumSubscription.deleteMany({ user: userId });

    // 6. Remove company memberships
    await CompanyMember.deleteMany({ user: userId });

    // 7. Delete activity logs
    await ActivityLog.deleteMany({ user: userId });

    // 8. Delete moderation reports filed by this user
    await ModerationReport.deleteMany({ reportedBy: userId });

    // 9. Revoke all sessions
    const redis = getRedisClient();
    await redis.del(`refresh:${userId}`);

    // 10. Delete the user document
    await user.deleteOne();

    return res.json({ success: true, message: 'User and all associated data permanently deleted.' });
  } catch (err) {
    next(err);
  }
}

// ── Verification Queue ────────────────────────────────────────────────────────

/**
 * GET /api/admin/verifications
 * Paginated verification queue — all roles with pending status.
 */
async function listVerifications(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const query = { role: { $ne: 'admin' } };
    if (req.query.role)   query.role = req.query.role;
    if (req.query.status) query.verificationStatus = req.query.status;
    else                  query.verificationStatus = { $ne: 'none' }; // exclude users who never submitted

    const [users, total] = await Promise.all([
      User.find(query)
        .select('fullName phone role verificationStatus verificationDoc createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.json({ success: true, users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/verifications/:id
 * Approve or reject a verification.
 */
async function reviewVerification(req, res, next) {
  try {
    const { action } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(422).json({ success: false, message: 'action must be approve or reject.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.verificationStatus = action === 'approve' ? 'verified' : 'rejected';
    await user.save();

    await notifyVerificationStatus(req.app, {
      recipientId: user._id.toString(),
      phone: user.phone,
      status: user.verificationStatus,
    });

    return res.json({ success: true, user: { _id: user._id, verificationStatus: user.verificationStatus } });
  } catch (err) {
    next(err);
  }
}

// ── Content Moderation ────────────────────────────────────────────────────────

/**
 * POST /api/listings/:id/report
 */
async function reportListing(req, res, next) {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(422).json({ success: false, message: 'reason is required.' });

    const report = await ModerationReport.create({
      reportedBy: req.user._id,
      targetType: 'listing',
      targetId: req.params.id,
      reason,
    });

    return res.status(201).json({ success: true, report });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/messages/:id/report
 */
async function reportMessage(req, res, next) {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(422).json({ success: false, message: 'reason is required.' });

    const report = await ModerationReport.create({
      reportedBy: req.user._id,
      targetType: 'message',
      targetId: req.params.id,
      reason,
    });

    return res.status(201).json({ success: true, report });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/reports
 * Moderation report queue.
 */
async function listReports(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      ModerationReport.find({ status: 'open' })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ModerationReport.countDocuments({ status: 'open' }),
    ]);

    return res.json({ success: true, reports, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/reports/:id
 * Action a moderation report.
 */
async function actionReport(req, res, next) {
  try {
    const { action, actionTaken } = req.body;
    if (!['action', 'dismiss'].includes(action)) {
      return res.status(422).json({ success: false, message: 'action must be action or dismiss.' });
    }

    const report = await ModerationReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    report.status = action === 'action' ? 'actioned' : 'dismissed';
    report.actionTaken = actionTaken;
    report.actionBy = req.user._id;
    await report.save();

    if (action === 'action' && report.targetType === 'listing') {
      await Listing.findByIdAndUpdate(report.targetId, { status: 'removed' });
    }

    return res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
}

// ── Analytics Dashboard ───────────────────────────────────────────────────────

/**
 * GET /api/admin/analytics
 * Query params: startDate, endDate (ISO strings)
 * Returns period-scoped metrics + daily breakdown for charts + detailed lists
 */
async function getAdminAnalytics(req, res, next) {
  try {
    const PremiumSubscription = require('../models/PremiumSubscription');

    // ── Resolve date range ──────────────────────────────────────────────────
    const now = new Date();
    const start = req.query.startDate ? new Date(req.query.startDate) : (() => {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
    })();
    const end = req.query.endDate ? new Date(req.query.endDate) : (() => {
      const d = new Date(now); d.setHours(23, 59, 59, 999); return d;
    })();
    // Ensure end covers the full day
    end.setHours(23, 59, 59, 999);

    const periodFilter = { $gte: start, $lte: end };

    // ── All-time totals ─────────────────────────────────────────────────────
    const [
      totalUsers,
      activeUsers,
      usersByRole,
      totalListings,
      listingsByStatus,
      listingsByCategory,
      totalSubs,
      activeSubs,
      pendingSubs,
      allTimeRevenue,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Listing.countDocuments(),
      Listing.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Listing.aggregate([
        { $group: { _id: '$categorySlug', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 13 },
      ]),
      PremiumSubscription.countDocuments(),
      PremiumSubscription.countDocuments({ status: 'active' }),
      PremiumSubscription.countDocuments({ status: 'pending' }),
      PremiumSubscription.aggregate([
        { $match: { status: { $in: ['active', 'expired'] } } },
        { $group: { _id: null, total: { $sum: '$fee' } } },
      ]),
    ]);

    // ── Period-scoped counts ────────────────────────────────────────────────
    const [
      newUsers,
      newListings,
      newSubs,
      periodRevenue,
    ] = await Promise.all([
      User.countDocuments({ createdAt: periodFilter }),
      Listing.countDocuments({ createdAt: periodFilter }),
      PremiumSubscription.countDocuments({ createdAt: periodFilter }),
      PremiumSubscription.aggregate([
        { $match: { createdAt: periodFilter, status: { $in: ['active', 'expired'] } } },
        { $group: { _id: null, total: { $sum: '$fee' } } },
      ]),
    ]);

    // ── Daily breakdown for the period (for chart) ──────────────────────────
    const [dailyUsers, dailyListings, dailySubs] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: periodFilter } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Listing.aggregate([
        { $match: { createdAt: periodFilter } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      PremiumSubscription.aggregate([
        { $match: { createdAt: periodFilter } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, revenue: { $sum: '$fee' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // ── Recent lists for the period ─────────────────────────────────────────
    const [recentUsers, recentListings, recentSubsList] = await Promise.all([
      User.find({ createdAt: periodFilter })
        .select('fullName role phone createdAt isActive')
        .sort({ createdAt: -1 }).limit(50).lean(),
      Listing.find({ createdAt: periodFilter })
        .select('title categorySlug status price createdAt owner')
        .populate('owner', 'fullName role')
        .sort({ createdAt: -1 }).limit(50).lean(),
      PremiumSubscription.find({ createdAt: periodFilter })
        .select('categorySlug duration fee status paymentMethod createdAt user')
        .populate('user', 'fullName role')
        .sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    const roleMap   = Object.fromEntries(usersByRole.map(r => [r._id, r.count]));
    const statusMap = Object.fromEntries(listingsByStatus.map(s => [s._id, s.count]));

    return res.json({
      success: true,
      period: { start: start.toISOString(), end: end.toISOString() },
      allTime: {
        users:         { total: totalUsers, active: activeUsers, suspended: totalUsers - activeUsers, byRole: { user: roleMap.user || 0, broker: roleMap.broker || 0, company: roleMap.company || 0, admin: roleMap.admin || 0 } },
        listings:      { total: totalListings, active: statusMap.active || 0, inactive: statusMap.inactive || 0, expired: statusMap.expired || 0, topCategories: listingsByCategory.map(c => ({ category: c._id || 'unknown', count: c.count })) },
        subscriptions: { total: totalSubs, active: activeSubs, pending: pendingSubs, totalRevenue: allTimeRevenue[0]?.total || 0 },
      },
      period_stats: {
        newUsers:      newUsers,
        newListings:   newListings,
        newSubs:       newSubs,
        periodRevenue: periodRevenue[0]?.total || 0,
      },
      daily: {
        users:    dailyUsers.map(d => ({ date: d._id, count: d.count })),
        listings: dailyListings.map(d => ({ date: d._id, count: d.count })),
        subs:     dailySubs.map(d => ({ date: d._id, count: d.count, revenue: d.revenue })),
      },
      lists: {
        users:    recentUsers,
        listings: recentListings,
        subs:     recentSubsList,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/analytics/export
 * Downloads a CSV for the given period.
 * Query params: startDate, endDate
 */
async function exportAnalytics(req, res, next) {
  try {
    const PremiumSubscription = require('../models/PremiumSubscription');

    const now = new Date();
    const start = req.query.startDate ? new Date(req.query.startDate) : (() => { const d = new Date(now); d.setHours(0,0,0,0); return d; })();
    const end   = req.query.endDate   ? new Date(req.query.endDate)   : (() => { const d = new Date(now); d.setHours(23,59,59,999); return d; })();
    end.setHours(23, 59, 59, 999);
    const periodFilter = { $gte: start, $lte: end };

    const [users, listings, subs] = await Promise.all([
      User.find({ createdAt: periodFilter }).select('fullName role phone isActive createdAt').lean(),
      Listing.find({ createdAt: periodFilter }).select('title categorySlug status price createdAt').populate('owner', 'fullName').lean(),
      PremiumSubscription.find({ createdAt: periodFilter }).select('categorySlug duration fee status paymentMethod createdAt').populate('user', 'fullName').lean(),
    ]);

    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const fmt    = (d) => d ? new Date(d).toLocaleDateString('en-ET') : '';

    const rows = [
      '=== NEW USERS ===',
      'Name,Role,Phone,Status,Registered',
      ...users.map(u => [escape(u.fullName), escape(u.role), escape(u.phone), u.isActive ? 'Active' : 'Suspended', fmt(u.createdAt)].join(',')),
      '',
      '=== NEW LISTINGS ===',
      'Title,Category,Status,Price (ETB),Owner,Posted',
      ...listings.map(l => [escape(l.title), escape(l.categorySlug), escape(l.status), l.price ?? 0, escape(l.owner?.fullName), fmt(l.createdAt)].join(',')),
      '',
      '=== SUBSCRIPTIONS ===',
      'User,Category,Duration,Fee (ETB),Status,Payment,Date',
      ...subs.map(s => [escape(s.user?.fullName), escape(s.categorySlug), escape(s.duration), s.fee ?? 0, escape(s.status), escape(s.paymentMethod), fmt(s.createdAt)].join(',')),
    ];

    const filename = `analytics_${start.toISOString().slice(0,10)}_to_${end.toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    return res.send('\uFEFF' + rows.join('\n')); // BOM for Excel UTF-8
  } catch (err) {
    next(err);
  }
}

// ── Category Management ───────────────────────────────────────────────────────

/**
 * GET /api/admin/categories
 */
async function listCategories(req, res, next) {
  try {
    const categories = await Category.find().lean();
    return res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/categories
 */
async function createCategory(req, res, next) {
  try {
    const { name, slug, fields } = req.body;
    if (!name || !slug) {
      return res.status(422).json({ success: false, message: 'name and slug are required.' });
    }
    const category = await Category.create({ name, slug, fields, isActive: true });
    return res.status(201).json({ success: true, category });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/categories/:id
 */
async function updateCategory(req, res, next) {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' }).lean();
    if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
    return res.json({ success: true, category });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/categories/:id
 */
async function deleteCategory(req, res, next) {
  try {
    const category = await Category.findByIdAndDelete(req.params.id).lean();
    if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
    return res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/categories/:id/status
 */
async function updateCategoryStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { returnDocument: 'after' },
    ).lean();
    if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
    return res.json({ success: true, category });
  } catch (err) {
    next(err);
  }
}

// ── Listing Management ────────────────────────────────────────────────────────

/**
 * GET /api/admin/listings/pending
 */
async function getPendingListings(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      Listing.find({ approvalStatus: 'pending' })
        .populate('owner', 'fullName phone profilePhoto')
        .populate('category', 'name slug')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Listing.countDocuments({ approvalStatus: 'pending' })
    ]);

    return res.json({
      success: true,
      listings,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/listings/:id/approve
 */
async function approveListing(req, res, next) {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      {
        approvalStatus: 'approved',
        status: 'active',
        approvedBy: req.user._id,
        approvedAt: new Date()
      },
      { new: true }
    ).populate('owner', 'fullName phone');

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    return res.json({ success: true, listing });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/listings/:id/reject
 */
async function rejectListing(req, res, next) {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(422).json({ success: false, message: 'Rejection reason is required.' });
    }

    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      {
        approvalStatus: 'rejected',
        status: 'inactive',
        rejectionReason: reason,
        approvedBy: req.user._id,
        approvedAt: new Date()
      },
      { new: true }
    ).populate('owner', 'fullName phone');

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    return res.json({ success: true, listing });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/listings
 */
async function getAllListings(req, res, next) {
  try {
    const { page = 1, limit = 20, status, approvalStatus } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (approvalStatus) query.approvalStatus = approvalStatus;

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .populate('owner', 'fullName phone profilePhoto')
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Listing.countDocuments(query)
    ]);

    return res.json({
      success: true,
      listings,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/listings/:id
 * Hard-delete a listing and its Cloudinary assets.
 */
async function adminDeleteListing(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    // Remove Cloudinary assets (best-effort)
    const cloudinary = require('../config/cloudinary');
    const assetUrls = [...(listing.images || [])];
    if (listing.video) assetUrls.push(listing.video);

    await Promise.allSettled(
      assetUrls.map((url) => {
        const publicId = extractPublicId(url);
        if (!publicId) return Promise.resolve();
        const resourceType = url === listing.video ? 'video' : 'image';
        return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      }),
    );

    await listing.deleteOne();
    return res.json({ success: true, message: 'Listing deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  suspendUser,
  reinstateUser,
  deleteUser,
  listVerifications,
  reviewVerification,
  reportListing,
  reportMessage,
  listReports,
  actionReport,
  getAdminAnalytics,
  exportAnalytics,
  listCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
  getPendingListings,
  approveListing,
  rejectListing,
  getAllListings,
  adminDeleteListing,
};
