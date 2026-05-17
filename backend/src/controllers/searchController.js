'use strict';

const Listing = require('../models/Listing');
const SavedSearch = require('../models/SavedSearch');

/**
 * GET /api/search
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
async function search(req, res, next) {
  try {
    const {
      q,
      category,
      subCategory,
      city,
      minPrice,
      maxPrice,
      region,
      lat,
      lng,
      radius,
      owner,
      page: pageRaw,
      limit: limitRaw,
    } = req.query;

    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 20));
    const skip = (page - 1) * limit;

    // Build query - only show approved listings
    const query = { status: 'active', approvalStatus: 'approved' };

    // Filter by owner (for "more from this seller" recommendations)
    if (owner) {
      query.owner = owner;
    }

    if (q) {
      query.$text = { $search: q };
    }

    if (category) {
      query.categorySlug = category;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
    }

    if (region) {
      const regionConditions = [
        { 'location.region': { $regex: region, $options: 'i' } },
        { 'location.city':   { $regex: region, $options: 'i' } },
      ];
      // Merge with existing $or if present, otherwise set it
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: regionConditions }];
        delete query.$or;
      } else {
        query.$or = regionConditions;
      }
    }

    // city filter (separate from region)
    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    // sub-category filter (maps to category-specific subCategory field)
    if (subCategory) {
      // subCategory is stored inside the category sub-document, e.g. automotive.vehicleType
      // We store it as a generic field across all category sub-docs
      query.$or = [
        ...(query.$or || []),
        { 'automotive.vehicleType':        subCategory },
        { 'electronics.subCategory':       subCategory },
        { 'homeFurniture.subCategory':     subCategory },
        { 'fashionClothing.subCategory':   subCategory },
        { 'sportsFitness.subCategory':     subCategory },
        { 'booksMedia.subCategory':        subCategory },
        { 'petsAnimals.subCategory':       subCategory },
        { 'services.serviceType':          subCategory },
        { 'jobs.jobType':                  subCategory },
        { 'businessIndustrial.subCategory': subCategory },
        { 'agriculture.subCategory':       subCategory },
        { 'realEstate.propertyType':       subCategory },
      ];
    }

    if (lat !== undefined && lng !== undefined && radius !== undefined) {
      const radiusInRadians = Number(radius) / 6371;
      query['location.coordinates'] = {
        $geoWithin: {
          $centerSphere: [[Number(lng), Number(lat)], radiusInRadians],
        },
      };
    }

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('owner', 'fullName profilePhoto role')
        .populate('companyOwner', 'companyName logo')
        .lean(),
      Listing.countDocuments(query),
    ]);

    // Related listings: same category, excluding already-returned ids
    let related = [];
    if (category || listings.length > 0) {
      const categorySlug = category || (listings[0] && listings[0].categorySlug);
      if (categorySlug) {
        const excludeIds = listings.map((l) => l._id);
        related = await Listing.find({
          status: 'active',
          approvalStatus: 'approved',
          categorySlug,
          _id: { $nin: excludeIds },
        })
          .sort({ isFeatured: -1, createdAt: -1 })
          .limit(5)
          .lean();
      }
    }

    return res.json({
      success: true,
      listings,
      related,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/search/saved  (protected)
 * Requirements: 9.6
 */
async function saveSearch(req, res, next) {
  try {
    const { q, category, minPrice, maxPrice, region, lat, lng, radius } = req.body;

    const params = {};
    if (q !== undefined) params.q = q;
    if (category !== undefined) params.category = category;
    if (minPrice !== undefined) params.minPrice = Number(minPrice);
    if (maxPrice !== undefined) params.maxPrice = Number(maxPrice);
    if (region !== undefined) params.region = region;
    if (lat !== undefined) params.lat = Number(lat);
    if (lng !== undefined) params.lng = Number(lng);
    if (radius !== undefined) params.radius = Number(radius);

    const saved = await SavedSearch.create({ user: req.user._id, params });
    return res.status(201).json({ success: true, savedSearch: saved });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/search/saved  (protected)
 * Requirements: 9.6
 */
async function getSavedSearches(req, res, next) {
  try {
    const savedSearches = await SavedSearch.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, savedSearches });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/search/saved/:id  (protected, owner only)
 * Requirements: 9.6
 */
async function deleteSavedSearch(req, res, next) {
  try {
    const saved = await SavedSearch.findById(req.params.id);
    if (!saved) {
      return res.status(404).json({ success: false, message: 'Saved search not found.' });
    }
    if (saved.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: not the owner.' });
    }
    await saved.deleteOne();
    return res.json({ success: true, message: 'Saved search deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { search, saveSearch, getSavedSearches, deleteSavedSearch };
