'use strict';

const { Router } = require('express');
const Category = require('../models/Category');

const router = Router();

/**
 * GET /api/categories
 * Public endpoint — returns all active categories.
 */
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name slug')
      .sort({ name: 1 })
      .lean();
    return res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
