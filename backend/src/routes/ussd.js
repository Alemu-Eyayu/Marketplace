'use strict';

const { Router } = require('express');
const Listing = require('../models/Listing');

const router = Router();

/**
 * POST /api/ussd
 * Ethio Telecom USSD gateway handler.
 * Requirements: 26.1
 *
 * Expected body: { sessionId, phoneNumber, serviceCode, text }
 * Response: plain text starting with CON (continue) or END (terminate)
 */
router.post('/', async (req, res) => {
  const { sessionId, phoneNumber, text = '' } = req.body;
  const parts = text.split('*').filter(Boolean);
  const level = parts.length;

  try {
    // Level 0 — Main menu
    if (level === 0) {
      return res.send('CON Welcome to EthioGebiya\n1. Search Real Estate\n2. Search Automotive\n3. About');
    }

    const choice = parts[0];

    // Level 1 — Category selected
    if (level === 1) {
      if (choice === '1' || choice === '2') {
        return res.send('CON Enter region (e.g. Addis Ababa):');
      }
      if (choice === '3') {
        return res.send('END EthioGebiya — Ethiopia\'s trusted marketplace. Visit ethiogebiya.com');
      }
      return res.send('END Invalid option.');
    }

    // Level 2 — Region entered, show listings
    if (level === 2) {
      const categorySlug = parts[0] === '1' ? 'real-estate' : 'automotive';
      const region = parts[1];

      const listings = await Listing.find({
        status: 'active',
        categorySlug,
        'location.region': { $regex: region, $options: 'i' },
      }).limit(5).lean();

      if (listings.length === 0) {
        return res.send('END No listings found in that region.');
      }

      const menu = listings.map((l, i) => `${i + 1}. ${l.title} - ${l.price} ETB`).join('\n');
      return res.send(`CON Listings in ${region}:\n${menu}\n0. Back`);
    }

    // Level 3 — Listing selected
    if (level === 3) {
      const categorySlug = parts[0] === '1' ? 'real-estate' : 'automotive';
      const region = parts[1];
      const listingIndex = parseInt(parts[2], 10) - 1;

      if (parts[2] === '0') {
        return res.send('CON Welcome to EthioGebiya\n1. Search Real Estate\n2. Search Automotive\n3. About');
      }

      const listings = await Listing.find({
        status: 'active',
        categorySlug,
        'location.region': { $regex: region, $options: 'i' },
      }).limit(5).lean();

      const listing = listings[listingIndex];
      if (!listing) return res.send('END Invalid selection.');

      return res.send(`CON ${listing.title}\nPrice: ${listing.price} ETB\nRegion: ${listing.location?.region}\n\n1. Contact Seller\n0. Back`);
    }

    // Level 4 — Contact action
    if (level === 4) {
      if (parts[3] === '1') {
        return res.send('END To contact the seller, visit ethiogebiya.com or call our support line.');
      }
      return res.send('CON Welcome to EthioGebiya\n1. Search Real Estate\n2. Search Automotive\n3. About');
    }

    return res.send('END Session ended.');
  } catch (err) {
    console.error('[USSD] Error:', err);
    return res.send('END Service temporarily unavailable. Please try again.');
  }
});

module.exports = router;
