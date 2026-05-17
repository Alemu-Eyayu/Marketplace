'use strict';

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('ioredis');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

/**
 * Initialise Socket.io with Redis adapter.
 * Attaches the io instance to app so controllers can emit events.
 * Requirements: 10.1, 10.2, 10.3
 */
function initSocket(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Redis pub/sub clients for the adapter
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const isTls = redisUrl.startsWith('rediss://');
  const pubClient = createClient(redisUrl, {
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('[Socket Redis pub] error:', err.message));
  subClient.on('error', (err) => console.error('[Socket Redis sub] error:', err.message));

  io.adapter(createAdapter(pubClient, subClient));

  // JWT authentication middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required.'));
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = payload.sub || payload.id;
      next();
    } catch (_) {
      next(new Error('Invalid token.'));
    }
  });

  io.on('connection', (socket) => {
    // Join personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Join a conversation room
    socket.on('conversation:join', (conversationId) => {
      socket.join(conversationId);
    });

    // Leave a conversation room
    socket.on('conversation:leave', (conversationId) => {
      socket.leave(conversationId);
    });

    // Typing indicator
    socket.on('conversation:typing', ({ conversationId, isTyping }) => {
      socket.to(conversationId).emit('conversation:typing', {
        userId: socket.userId,
        isTyping,
      });
    });

    // Send message via socket (persists to DB then broadcasts)
    socket.on('message:send', async (data, ack) => {
      try {
        const { conversationId, body, attachment } = data;

        const conversation = await Conversation.findById(conversationId).lean();
        if (!conversation) {
          if (ack) ack({ error: 'Conversation not found.' });
          return;
        }

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === socket.userId,
        );
        if (!isParticipant) {
          if (ack) ack({ error: 'Forbidden.' });
          return;
        }

        // Check if sender is blocked
        const otherParticipants = conversation.participants.filter(
          (p) => p.toString() !== socket.userId,
        );
        for (const participantId of otherParticipants) {
          const participant = await User.findById(participantId).select('blockedUsers').lean();
          if (participant && participant.blockedUsers.some((b) => b.toString() === socket.userId)) {
            if (ack) ack({ success: true }); // silently discard
            return;
          }
        }

        const message = await Message.create({
          conversation: conversationId,
          sender: socket.userId,
          body,
          attachment,
        });

        await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id });

        // Broadcast to all in the conversation room
        io.to(conversationId).emit('message:receive', message);

        if (ack) ack({ success: true, message });
      } catch (err) {
        if (ack) ack({ error: err.message });
      }
    });

    socket.on('disconnect', () => {
      socket.leave(`user:${socket.userId}`);
    });
  });

  // Attach io to app for use in controllers
  app.set('io', io);

  return io;
}

module.exports = { initSocket };
