'use strict';

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { notifyNewMessage } = require('../services/notificationService');

// Strip phone numbers and email addresses from message body (Req 10.5)
const PHONE_RE = /(\+?[\d\s\-().]{7,})/g;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

function sanitizeBody(text) {
  if (!text) return text;
  return text.replace(EMAIL_RE, '[contact removed]').replace(PHONE_RE, '[contact removed]');
}

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

/**
 * POST /api/conversations
 * Start or retrieve an existing conversation about a listing.
 * Requirements: 10.1
 */
async function createConversation(req, res, next) {
  try {
    const { listingId } = req.body;
    if (!listingId) {
      return res.status(422).json({ success: false, message: 'listingId is required.' });
    }

    // Get the listing to find the seller
    const Listing = require('../models/Listing');
    const listing = await Listing.findById(listingId).select('owner').lean();
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    // Don't allow seller to message themselves
    if (listing.owner.toString() === req.user._id.toString()) {
      return res.status(422).json({ success: false, message: 'Cannot start conversation with yourself.' });
    }

    const participants = [req.user._id, listing.owner];

    // Find existing conversation between these participants for this listing
    let conversation = await Conversation.findOne({
      listing: listingId,
      participants: { $all: participants },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        listing: listingId,
        participants: participants,
      });
    }

    // Populate the conversation before returning
    conversation = await Conversation.findById(conversation._id)
      .populate('listing', 'title images')
      .lean();

    return res.status(201).json({ success: true, conversation });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/conversations
 * List all conversations for the authenticated user.
 * Requirements: 10.1
 */
async function getConversations(req, res, next) {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('listing', 'title images')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'fullName photo'
        }
      })
      .sort({ updatedAt: -1 })
      .lean();

    // Single aggregation to get unread counts for all conversations at once
    const convIds = conversations.map((c) => c._id);
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          conversation: { $in: convIds },
          sender: { $ne: req.user._id },
          isRead: false,
        },
      },
      { $group: { _id: '$conversation', count: { $sum: 1 } } },
    ]);
    const unreadMap = Object.fromEntries(unreadAgg.map((r) => [r._id.toString(), r.count]));

    const conversationsWithUnread = conversations.map((c) => ({
      ...c,
      unreadCount: unreadMap[c._id.toString()] || 0,
    }));

    return res.json({ success: true, conversations: conversationsWithUnread });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/conversations/:id/messages
 * Paginated message history for a conversation.
 * Requirements: 10.2, 10.3, 10.8
 */
async function getMessages(req, res, next) {
  try {
    const conversation = await Conversation.findById(req.params.id).lean();
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString(),
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({ conversation: req.params.id })
        .populate('sender', 'fullName photo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversation: req.params.id }),
    ]);

    // Mark messages as read for the current user (messages they didn't send)
    await Message.updateMany(
      { 
        conversation: req.params.id,
        sender: { $ne: req.user._id },
        isRead: false
      },
      { isRead: true }
    );

    return res.json({
      success: true,
      messages: messages.reverse(),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/conversations/:id/messages
 * Send a message (with optional attachment).
 * Requirements: 10.2, 10.4, 10.5
 */
async function sendMessage(req, res, next) {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString(),
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    // Check if sender is blocked by any participant (Req 10.6, 10.7)
    const otherParticipants = conversation.participants.filter(
      (p) => p.toString() !== req.user._id.toString(),
    );
    for (const participantId of otherParticipants) {
      const participant = await User.findById(participantId).select('blockedUsers').lean();
      if (participant && participant.blockedUsers.some((b) => b.toString() === req.user._id.toString())) {
        // Silently discard — return 200 to sender
        return res.json({ success: true, message: 'Message sent.' });
      }
    }

    // Upload attachment if present (Req 10.4)
    let attachmentUrl;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'ethiogebiya/messages',
        resource_type: 'auto',
      });
      attachmentUrl = result.secure_url;
    }

    // Sanitize body — strip phone/email (Req 10.5)
    const body = sanitizeBody(req.body.body);

    if (!body && !attachmentUrl) {
      return res.status(422).json({ success: false, message: 'Message body or attachment is required.' });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      body,
      attachment: attachmentUrl,
    });

    // Populate sender information for broadcasting
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'fullName photo')
      .lean();

    // Update conversation lastMessage
    conversation.lastMessage = message._id;
    await conversation.save();

    // Emit via Socket.io to other participants only (not the sender)
    const io = req.app.get('io');
    if (io) {
      // Emit to the conversation room so the recipient's Chat page updates in real-time.
      // The sender's Chat page will ignore this via deduplication in appendMessage reducer.
      io.to(conversation._id.toString()).emit('message:receive', populatedMessage);

      // Also emit to each recipient's personal room for NotificationProvider
      // unread count refresh — sender's personal room is intentionally excluded.
      for (const participantId of otherParticipants) {
        io.to(`user:${participantId.toString()}`).emit('message:receive', populatedMessage);
      }
    }

    // Send in-app notification to recipients only (not the sender)
    const senderName = populatedMessage.sender?.fullName || 'Someone';
    for (const participantId of otherParticipants) {
      notifyNewMessage(req.app, {
        recipientId: participantId.toString(),
        senderName,
        conversationId: conversation._id.toString(),
      }).catch(() => {}); // non-blocking
    }

    return res.status(201).json({ success: true, message: populatedMessage });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/:id/block
 * Block a user. Requirements: 10.6
 */
async function blockUser(req, res, next) {
  try {
    const targetId = req.params.id;
    if (targetId === req.user._id.toString()) {
      return res.status(422).json({ success: false, message: 'Cannot block yourself.' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: targetId },
    });

    return res.json({ success: true, message: 'User blocked.' });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/users/:id/block
 * Unblock a user. Requirements: 10.7
 */
async function unblockUser(req, res, next) {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: req.params.id },
    });

    return res.json({ success: true, message: 'User unblocked.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  blockUser,
  unblockUser,
};
