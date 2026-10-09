'use strict';

const cloudinary = require('../config/cloudinary');
const Listing = require('../models/Listing');
const Category = require('../models/Category');
const User = require('../models/User');
const Company = require('../models/Company');
const PremiumSubscription = require('../models/PremiumSubscription');
const { logActivity } = require('../middleware/activityLog');
const { extractPublicId } = require('../utils/cloudinaryUtils');

// Category-specific required fields - dynamically loaded from Category model
// This is kept for backward compatibility but should use Category.requiredFields
const CATEGORY_REQUIRED_FIELDS = {
  'real-estate': ['propertyType', 'listingType', 'sizeSqm', 'furnishingStatus'],
  automotive: ['vehicleType', 'make', 'model', 'year', 'mileage', 'condition', 'fuelType', 'transmission'],
  electronics: ['subCategory', 'brand', 'model', 'condition'],
  'home-furniture': ['subCategory', 'condition'],
  'fashion-clothing': ['subCategory', 'size', 'condition'],
  'sports-fitness': ['subCategory', 'condition'],
  'books-media': ['subCategory', 'title', 'condition'],
  'pets-animals': ['subCategory'],
  services: ['serviceType'],
  'domestic-jobs': ['jobType', 'salary'],
  'professional-jobs': ['jobType', 'industry', 'jobTitle', 'experienceLevel'],
  'business-industrial': ['subCategory', 'condition'],
  agriculture: ['subCategory'],
};

const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Upload a buffer to Cloudinary and return the secure_url.
 */
function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

/**
 * POST /api/listings
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
 */
async function createListing(req, res, next) {
  try {
    // 1. Fetch user for free-trial tracking (phone + verification already checked by requireApproved middleware)
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(403).json({ success: false, message: 'User not found.' });
    }

    const {
      title,
      description,
      categorySlug,
      price,
      currency,
      location: locationRaw,
    } = req.body;

    // Extract all possible category-specific fields from req.body
    const categoryFields = { ...req.body };

    // 2. Validate required base fields (Req 7.2)
    const missing = [];
    if (!title) missing.push('title');
    if (!description) missing.push('description');
    if (!categorySlug) missing.push('categorySlug');
    if (price === undefined || price === null || price === '') missing.push('price');

    // Parse location — only include coordinates if lat/lng provided
    let location;
    try {
      location = typeof locationRaw === 'string' ? JSON.parse(locationRaw) : locationRaw;
    } catch (_) {
      return res.status(422).json({ success: false, message: 'location must be valid JSON.' });
    }

    // Strip coordinates if empty to avoid 2dsphere index error
    if (location && location.coordinates) {
      const coords = location.coordinates.coordinates;
      if (!coords || !Array.isArray(coords) || coords.length < 2) {
        delete location.coordinates;
      }
    }

    if (!location || !location.region) missing.push('location.region');

    if (missing.length > 0) {
      return res.status(422).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}.`,
      });
    }

    // 3. Validate categorySlug (Req 7.3)
    const validCategories = [
      'real-estate', 
      'automotive', 
      'electronics', 
      'home-furniture', 
      'fashion-clothing', 
      'sports-fitness', 
      'books-media', 
      'pets-animals', 
      'services', 
      'domestic-jobs',
      'professional-jobs',
      'business-industrial', 
      'agriculture'
    ];
    
    if (!validCategories.includes(categorySlug)) {
      return res.status(422).json({
        success: false,
        message: `Invalid categorySlug. Must be one of: ${validCategories.join(', ')}.`,
      });
    }

    // 3b. Category-role restriction — certain categories require broker or company
    const BROKER_COMPANY_ONLY = ['domestic-jobs', 'professional-jobs', 'services', 'business-industrial', 'agriculture'];
    const COMPANY_ONLY        = ['professional-jobs', 'services'];

    if (req.user.role === 'user') {
      if (BROKER_COMPANY_ONLY.includes(categorySlug)) {
        return res.status(403).json({
          success: false,
          message: `The "${categorySlug}" category is for verified brokers and companies only.`,
        });
      }
    }

    if (req.user.role === 'broker' && COMPANY_ONLY.includes(categorySlug)) {
      return res.status(403).json({
        success: false,
        message: `The "${categorySlug}" category is for registered companies only.`,
      });
    }

    // 4. Category-specific validation (Req 7.3)
    const requiredCatFields = CATEGORY_REQUIRED_FIELDS[categorySlug];
    const bodyForCat = req.body;
    const missingCat = requiredCatFields.filter((f) => {
      const val = bodyForCat[f];
      return val === undefined || val === null || val === '';
    });
    if (missingCat.length > 0) {
      return res.status(422).json({
        success: false,
        message: `Missing required ${categorySlug} fields: ${missingCat.join(', ')}.`,
      });
    }

    // 5. Resolve Category document and check it's active (Req 21.3)
    const categoryDoc = await Category.findOne({ slug: categorySlug }).lean();
    if (!categoryDoc) {
      return res.status(422).json({ success: false, message: `Category "${categorySlug}" not found.` });
    }
    if (!categoryDoc.isActive) {
      return res.status(422).json({ success: false, message: `Category "${categorySlug}" is not accepting new listings.` });
    }

    // 5b. Premium subscription gate — all non-admin roles must have an active subscription
    //     OR be using their one-time free trial (first listing ever)
    if (req.user.role !== 'admin') {
      const now = new Date();
      const activeSub = await PremiumSubscription.findOne({
        user: req.user._id,
        categorySlug,
        status: 'active',
        expiryDate: { $gt: now },
      }).lean();

      if (!activeSub) {
        // Check free trial eligibility
        const userDoc = await User.findById(req.user._id).select('hasUsedFreeTrial').lean();
        if (!userDoc || userDoc.hasUsedFreeTrial) {
          return res.status(403).json({
            success: false,
            message: `You need an active premium subscription for the "${categorySlug}" category to post listings. Please subscribe first.`,
            requiresSubscription: true,
            categorySlug,
          });
        }
        // First listing — mark free trial as used (will be set after successful creation)
        // We'll update it after the listing is saved below
      }
    }

    // 6. Duplicate detection (Req 7.7) — warn, don't block
    const duplicate = await Listing.findOne({
      owner: req.user._id,
      title,
      price: Number(price),
      status: 'active',
    }).lean();
    if (duplicate) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: 'Potential duplicate listing detected.',
      });
    }

    // 7. Media validation and Cloudinary upload (Req 7.4, 7.5)
    const imageFiles = (req.files && req.files.images) || [];
    const videoFiles = (req.files && req.files.video) || [];

    // Require at least one media type
    if (imageFiles.length === 0 && videoFiles.length === 0) {
      return res.status(422).json({ 
        success: false, 
        message: 'At least one image or video is required.' 
      });
    }

    if (imageFiles.length > 10) {
      return res.status(422).json({ success: false, message: 'Maximum 10 images allowed.' });
    }

    const oversizedImage = imageFiles.find((f) => f.size > IMAGE_MAX_BYTES);
    if (oversizedImage) {
      return res.status(422).json({ success: false, message: 'Each image must be 10 MB or less.' });
    }

    if (videoFiles.length > 1) {
      return res.status(422).json({ success: false, message: 'Maximum 1 video allowed.' });
    }

    const videoFile = videoFiles[0] || null;
    if (videoFile && videoFile.size > VIDEO_MAX_BYTES) {
      return res.status(422).json({ success: false, message: 'Video must be 50 MB or less.' });
    }

    // Upload images to Cloudinary
    const imageUrls = await Promise.all(
      imageFiles.map((f) =>
        uploadToCloudinary(f.buffer, {
          folder: 'ethiogebiya/listings',
          resource_type: 'image',
        }).then((r) => r.secure_url),
      ),
    );

    // Upload video to Cloudinary
    let videoUrl;
    if (videoFile) {
      try {
        const videoResult = await uploadToCloudinary(videoFile.buffer, {
          folder: 'ethiogebiya/listings',
          resource_type: 'video',
        });
        videoUrl = videoResult.secure_url;
      } catch (videoErr) {
        console.error('[createListing] Video upload failed:', videoErr.message);
        return res.status(422).json({
          success: false,
          message: `Video upload failed: ${videoErr.message}. Try a smaller file or different format.`,
        });
      }
    }

    // 8. Build category-specific sub-document
    const listingData = {
      owner: req.user._id,
      title,
      description,
      category: categoryDoc._id,
      categorySlug,
      price: Number(price),
      currency: currency || 'ETB',
      location,
      images: imageUrls,
      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // now + 30 days
    };

    if (videoUrl) listingData.video = videoUrl;

    // Dynamically populate category-specific fields based on categorySlug
    const categoryFieldMap = {
      'real-estate': 'realEstate',
      'automotive': 'automotive',
      'electronics': 'electronics',
      'home-furniture': 'homeFurniture',
      'fashion-clothing': 'fashionClothing',
      'sports-fitness': 'sportsFitness',
      'books-media': 'booksMedia',
      'pets-animals': 'petsAnimals',
      'services': 'services',
      'domestic-jobs': 'domesticJobs',
      'professional-jobs': 'professionalJobs',
      'business-industrial': 'businessIndustrial',
      'agriculture': 'agriculture',
    };

    const categoryFieldName = categoryFieldMap[categorySlug];
    if (categoryFieldName && categoryDoc.requiredFields) {
      const categoryData = {};
      
      // Extract all fields defined in the category schema
      categoryDoc.requiredFields.forEach(field => {
        const value = categoryFields[field.key];
        if (value !== undefined && value !== null && value !== '') {
          // Convert to appropriate type
          if (field.type === 'number') {
            categoryData[field.key] = Number(value);
          } else {
            categoryData[field.key] = value;
          }
        }
      });

      if (Object.keys(categoryData).length > 0) {
        listingData[categoryFieldName] = categoryData;
      }
    }

    // 9. If user is company role, attach company ownership
    // Note: approval already verified by requireApproved middleware
    if (req.user.role === 'company') {
      const company = await Company.findOne({
        adminUser: req.user._id,
        isActive: true,
      }).lean();
      if (!company) {
        return res.status(403).json({
          success: false,
          message: 'No active company found for your account.',
        });
      }
      listingData.ownerType = 'company';
      listingData.companyOwner = company._id;
      listingData.postedBy = req.user._id;
    }

    // 10. Persist listing
    // Auto-approve listings from verified brokers and companies — they've already
    // been vetted by an admin via requireApproved middleware.
    listingData.approvalStatus = 'approved';
    listingData.approvedAt = new Date();

    // Allow the creator to feature the listing at creation time
    if (req.body.isFeatured === 'true' || req.body.isFeatured === true) {
      listingData.isFeatured = true;
    }

    const listing = await Listing.create(listingData);

    // Mark free trial as used if this was a trial listing (no active subscription)
    if (req.user.role !== 'admin') {
      const now = new Date();
      const activeSub = await PremiumSubscription.findOne({
        user: req.user._id,
        categorySlug,
        status: 'active',
        expiryDate: { $gt: now },
      }).lean();
      if (!activeSub) {
        await User.findByIdAndUpdate(req.user._id, { hasUsedFreeTrial: true });
      }
    }

    // 11. Log activity
    await logActivity(req.user._id, 'listing_created', { listingId: listing._id, title });

    // 12. Notify admins of the new listing
    const { notifyAdminNewListing } = require('../services/notificationService');
    await notifyAdminNewListing(req.app, {
      listingId: listing._id.toString(),
      title,
      ownerName: user.fullName || 'A user',
      categorySlug,
    });

    return res.status(201).json({ success: true, listing });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/listings/my  (protected)
 * Requirements: 8.1
 */
async function getMyListings(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      Listing.find({ owner: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Listing.countDocuments({ owner: req.user._id }),
    ]);

    return res.json({
      success: true,
      listings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/listings/:id  (public)
 * Requirements: 8.2, 9.7 — increment viewCount on each fetch
 */
async function getListingById(req, res, next) {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { returnDocument: 'after' },
    )
      .populate('owner', 'fullName profilePhoto role verificationStatus phone email location city region bio website specializations settings')
      .populate('companyOwner', 'companyName logo')
      .lean();
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }
    return res.json({ success: true, listing });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/listings/:id  (protected, owner only)
 * Requirements: 8.3
 */
async function updateListing(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }
    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: not the owner.' });
    }

    const allowed = [
      'title', 'description', 'price', 'currency', 'location',
      'realEstate', 'automotive', 'electronics', 'homeFurniture',
      'fashionClothing', 'sportsFitness', 'booksMedia', 'petsAnimals',
      'services', 'domesticJobs', 'professionalJobs', 'businessIndustrial', 'agriculture', 'customFields',
    ];
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    }

    await listing.save();
    return res.json({ success: true, listing });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/listings/:id  (protected, owner only)
 * Requirements: 8.4
 */
async function deleteListing(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }
    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: not the owner.' });
    }

    // Delete all Cloudinary assets
    const assetUrls = [...(listing.images || [])];
    if (listing.video) assetUrls.push(listing.video);

    await Promise.allSettled(
      assetUrls.map((url) => {
        const publicId = extractPublicId(url);
        if (!publicId) return Promise.resolve();
        const resourceType = url === listing.video ? 'video' : 'image';
        return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      }),
    );

    await listing.deleteOne();
    return res.json({ success: true, message: 'Listing deleted.' });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/listings/:id/status  (protected, owner only)
 * Requirements: 8.5
 */
async function updateListingStatus(req, res, next) {
  try {
    const { action } = req.body;
    if (!['activate', 'deactivate', 'renew'].includes(action)) {
      return res.status(422).json({ success: false, message: 'action must be activate, deactivate, or renew.' });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }
    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: not the owner.' });
    }

    if (action === 'activate') {
      listing.status = 'active';
    } else if (action === 'deactivate') {
      listing.status = 'inactive';
    } else if (action === 'renew') {
      if (listing.status !== 'expired') {
        return res.status(422).json({ success: false, message: 'renew is only allowed for expired listings.' });
      }
      listing.status = 'active';
      listing.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    await listing.save();
    return res.json({ success: true, listing });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/listings/:id/feature  (protected, owner only — broker premium)
 * Toggles the isFeatured flag on a listing.
 */
async function toggleFeatureListing(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }
    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: not the owner.' });
    }

    listing.isFeatured = !listing.isFeatured;
    await listing.save();

    return res.json({ success: true, listing });
  } catch (err) {
    next(err);
  }
}

module.exports = { createListing, getMyListings, getListingById, updateListing, deleteListing, updateListingStatus, toggleFeatureListing };
