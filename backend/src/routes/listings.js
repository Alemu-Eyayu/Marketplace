'use strict';

const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const requireApproved = require('../middleware/requireApproved');
const { listingMediaUpload } = require('../middleware/upload');
const {
  createListing,
  getMyListings,
  getListingById,
  updateListing,
  deleteListing,
  updateListingStatus,
  toggleFeatureListing,
} = require('../controllers/listingController');

const router = Router();

// All authenticated users (user, broker, company) can create/manage listings
// Users must be phone-verified; brokers and companies must also be approved
const listingOwners = [authenticate, requireRole('user', 'broker', 'company'), requireApproved];

/**
 * POST /api/listings
 */
router.post(
  '/',
  ...listingOwners,
  listingMediaUpload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'video', maxCount: 1 },
  ]),
  createListing,
);

/**
 * GET /api/listings/my  — MUST be before /:id to avoid route conflict
 */
router.get('/my', ...listingOwners, getMyListings);

/**
 * GET /api/listings/:id  (public)
 */
router.get('/:id', getListingById);

/**
 * PUT /api/listings/:id
 */
router.put('/:id', ...listingOwners, updateListing);

/**
 * DELETE /api/listings/:id
 */
router.delete('/:id', ...listingOwners, deleteListing);

/**
 * PATCH /api/listings/:id/status
 */
router.patch('/:id/status', ...listingOwners, updateListingStatus);

/**
 * PATCH /api/listings/:id/feature  (broker premium)
 */
router.patch('/:id/feature', ...listingOwners, toggleFeatureListing);

module.exports = router;
