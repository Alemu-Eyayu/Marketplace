'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = Router();

/**
 * GET /api/notifications
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notifications/unread-count
 */
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return res.json({ success: true, count });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:id/read
 */
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
    );
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/read-all
 */
router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true },
    );
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
