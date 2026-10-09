'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { search, saveSearch, getSavedSearches, deleteSavedSearch } = require('../controllers/searchController');

const router = Router();

/**
 * GET /api/search
 * Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7
 */
router.get('/', search);

/**
 * POST /api/search/saved  (protected)
 * Requirements: 9.4
 */
router.post('/saved', authenticate, saveSearch);

/**
 * GET /api/search/saved  (protected)
 * Requirements: 9.4
 */
router.get('/saved', authenticate, getSavedSearches);

/**
 * DELETE /api/search/saved/:id  (protected, owner only)
 * Requirements: 9.4
 */
router.delete('/saved/:id', authenticate, deleteSavedSearch);

module.exports = router;
