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

module.exports = router;
