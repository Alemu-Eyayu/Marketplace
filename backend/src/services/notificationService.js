'use strict';

const axios = require('axios');
const Notification = require('../models/Notification');

/**
 * Create an in-app notification and optionally emit via Socket.io.
 * @param {object} app - Express app (for io access)
 * @param {object} opts
 * @param {string} opts.recipientId
 * @param {string} opts.type
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {string} [opts.relatedId]
 * @param {string} [opts.relatedModel]
 */
async function createNotification(app, { recipientId, type, title, body, relatedId, relatedModel }) {
  const notification = await Notification.create({
    recipient: recipientId,
    type,
    title,
    body,
    relatedId,
    relatedModel,
  });

  // Push real-time notification via Socket.io
  const io = app && app.get('io');
  if (io) {
    io.to(`user:${recipientId}`).emit('notification:new', notification);
  }

  return notification;
}

/**
 * Send an SMS with retry (3 attempts, exponential backoff).
 * Requirements: 11.3, 11.5
 */
async function sendSms(phone, message, retries = 3) {
  const smsUrl = process.env.SMS_GATEWAY_URL;
  if (!smsUrl) {
    console.log(`[SMS] SMS_GATEWAY_URL not set — skipping SMS to ${phone}: ${message}`);
    return;
  }

  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await axios.post(smsUrl, { to: phone, message });
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
      }
    }
  }
  console.error(`[SMS] Failed after ${retries} attempts to ${phone}:`, lastErr?.message);
}

/**
 * Notify recipient of a new message.
 * Requirements: 11.1
 */
async function notifyNewMessage(app, { recipientId, senderName, conversationId }) {
  return createNotification(app, {
    recipientId,
    type: 'message',
    title: 'New Message',
    body: `You have a new message from ${senderName}.`,
    relatedId: conversationId,
    relatedModel: 'Conversation',
  });
}

/**
 * Notify recipient of a new offer.
 * Requirements: 11.2
 */
async function notifyNewOffer(app, { recipientId, listingId, offerAmount }) {
  return createNotification(app, {
    recipientId,
    type: 'new_offer',
    title: 'New Offer',
    body: `You received a new offer of ${offerAmount} ETB.`,
    relatedId: listingId,
    relatedModel: 'Listing',
  });
}

/**
 * Notify user of verification status change.
 * Requirements: 11.5
 */
async function notifyVerificationStatus(app, { recipientId, phone, status }) {
  const title = status === 'verified' ? 'Identity Verified' : 'Verification Rejected';
  const body = status === 'verified'
    ? 'Your identity has been verified. You now have full access.'
    : 'Your identity verification was rejected. Please re-submit your documents.';

  await createNotification(app, {
    recipientId,
    type: `verification_${status}`,
    title,
    body,
  });

  if (phone) {
    await sendSms(phone, body);
  }
}

/**
 * Notify user that their listing expires in 3 days.
 * Requirements: 11.4
 */
async function notifyListingExpiryWarning(app, { recipientId, listingId, listingTitle }) {
  return createNotification(app, {
    recipientId,
    type: 'listing_expiry_warning',
    title: 'Listing Expiring Soon',
    body: `Your listing "${listingTitle}" expires in 3 days. Renew it to keep it active.`,
    relatedId: listingId,
    relatedModel: 'Listing',
  });
}

module.exports = {
  createNotification,
  sendSms,
  notifyNewMessage,
  notifyNewOffer,
  notifyVerificationStatus,
  notifyListingExpiryWarning,
};

