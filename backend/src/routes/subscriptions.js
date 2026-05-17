'use strict';

const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  subscribe,
  cancelSubscription,
  getSubscription,
  featureListing,
  getListingAnalytics,
  getAggregateAnalytics,
} = require('../controllers/subscriptionController');

const router = Router();

// Subscriptions
router.post('/subscriptions', authenticate, requireRole('broker'), subscribe);
router.delete('/subscriptions', authenticate, requireRole('broker'), cancelSubscription);
router.get('/subscriptions', authenticate, getSubscription);

// Featured listings
router.patch('/listings/:id/feature', authenticate, requireRole('broker'), featureListing);

// Analytics
router.get('/analytics/listings', authenticate, requireRole('broker'), getListingAnalytics);
router.get('/analytics/aggregate', authenticate, requireRole('broker'), getAggregateAnalytics);

module.exports = router;
