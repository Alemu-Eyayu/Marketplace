'use strict';

const ActivityLog = require('../models/ActivityLog');

/**
 * Log a user activity event to the ActivityLog collection.
 * Non-fatal — errors are swallowed so callers are never disrupted.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} event  e.g. 'login', 'listing_created', 'payment_initiated'
 * @param {object} [metadata]
 */
async function logActivity(userId, event, metadata = {}) {
  try {
    await ActivityLog.create({ user: userId, event, metadata });
  } catch (err) {
    console.error('[activityLog] Failed to write activity log (non-fatal):', err.message);
  }
}

module.exports = { logActivity };
