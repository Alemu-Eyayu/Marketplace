'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { blockUser, unblockUser } = require('../controllers/messagingController');
const User = require('../models/User');

const router = Router();

/**
 * PATCH /api/users/me/language
 * Save preferred language for the logged-in user
 */
router.patch('/me/language', authenticate, async (req, res) => {
  try {
    const { language } = req.body;
    if (!['en', 'am'].includes(language)) {
      return res.status(422).json({ success: false, message: 'Invalid language.' });
    }
    await User.findByIdAndUpdate(req.user._id, { preferredLanguage: language });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * POST /api/users/:id/block
 * Requirements: 10.6
 */
router.post('/:id/block', authenticate, blockUser);

/**
 * DELETE /api/users/:id/block
 * Requirements: 10.7
 */
router.delete('/:id/block', authenticate, unblockUser);

module.exports = router;
