'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { attachmentUpload } = require('../middleware/upload');
const {
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  blockUser,
  unblockUser,
} = require('../controllers/messagingController');

const router = Router();

// All messaging routes require authentication
router.use(authenticate);

/**
 * POST /api/conversations
 * Requirements: 10.1
 */
router.post('/', createConversation);

/**
 * GET /api/conversations
 * Requirements: 10.1
 */
router.get('/', getConversations);

/**
 * GET /api/conversations/:id/messages
 * Requirements: 10.2, 10.3, 10.8
 */
router.get('/:id/messages', getMessages);

/**
 * POST /api/conversations/:id/messages
 * Requirements: 10.2, 10.4, 10.5
 */
router.post('/:id/messages', attachmentUpload.single('attachment'), sendMessage);

module.exports = router;
