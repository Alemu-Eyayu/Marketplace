'use strict';

const { Router } = require('express');
const multer = require('multer');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  getPricing,
  submitRequest,
  getMySubscriptions,
  getAdminQueue,
  activateSubscription,
  deactivateSubscription,
  rejectSubscription,
  getSubscriptionById,
  initializeChapa,
  chapaCallback,
  verifyChapa,
} = require('../controllers/premiumSubscriptionController');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Public pricing info
router.get('/pricing', getPricing);

// Chapa payment routes
router.post('/chapa/initialize', authenticate, initializeChapa);
router.post('/chapa/callback',   chapaCallback);          // Chapa webhook (no auth)
router.get('/chapa/verify',      authenticate, verifyChapa);

// Subscriber routes
router.post('/', authenticate, upload.single('receipt'), submitRequest);
router.get('/my', authenticate, getMySubscriptions);
router.get('/:id', authenticate, getSubscriptionById);

// Admin-only routes
router.get('/', authenticate, requireRole('admin'), getAdminQueue);
router.patch('/:id/activate',   authenticate, requireRole('admin'), activateSubscription);
router.patch('/:id/deactivate', authenticate, requireRole('admin'), deactivateSubscription);
router.patch('/:id/reject',     authenticate, requireRole('admin'), rejectSubscription);

module.exports = router;
