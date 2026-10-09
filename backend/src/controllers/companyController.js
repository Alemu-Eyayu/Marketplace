'use strict';

const cloudinary = require('../config/cloudinary');
const Company = require('../models/Company');
const Listing = require('../models/Listing');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { createNotification } = require('../services/notificationService');
const { logActivity } = require('../middleware/activityLog');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// ─── Registration & Verification ─────────────────────────────────────────────

/**
 * POST /api/companies/register
 */
async function registerCompany(req, res, next) {
  try {
    const { companyName, businessRegistrationNumber, industry, contactEmail, contactPhone } = req.body;

    // Validate required fields
    const missing = [];
    if (!companyName) missing.push('companyName');
    if (!businessRegistrationNumber) missing.push('businessRegistrationNumber');
    if (!industry) missing.push('industry');
    if (!contactEmail) missing.push('contactEmail');
    if (!contactPhone) missing.push('contactPhone');
    if (!req.file) missing.push('businessRegistrationDoc');

    if (missing.length > 0) {
      return res.status(422).json({ success: false, message: `Missing required fields: ${missing.join(', ')}.` });
    }

    // Check duplicate registration number
    const existing = await Company.findOne({ businessRegistrationNumber }).lean();
    if (existing) {
      return res.status(409).json({ success: false, message: 'A company with this registration number already exists.' });
    }

    // Upload registration doc to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder: 'ethiogebiya/companies/docs',
      resource_type: 'auto',
    });

    // Create company
    const company = await Company.create({
      companyName,
      businessRegistrationNumber,
      businessRegistrationDoc: uploadResult.secure_url,
      industry,
      contactEmail,
      contactPhone,
      adminUser: req.user._id,
      verificationStatus: 'pending',
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    await Promise.allSettled(
      admins.map((admin) =>
        createNotification(req.app, {
          recipientId: admin._id.toString(),
          type: 'company_pending',
          title: 'New Company Registration',
          body: `${companyName} has submitted a company registration for review.`,
          relatedId: company._id.toString(),
          relatedModel: 'Company',
        }),
      ),
    );

    await logActivity(req.user._id, 'company_registered', { companyId: company._id, companyName });

    return res.status(201).json({ success: true, company });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/companies/:id/approve  (admin only)
 */
async function approveCompany(req, res, next) {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }
    if (company.verificationStatus !== 'pending') {
      return res.status(409).json({ success: false, message: 'Company is not in a pending state.' });
    }

    company.verificationStatus = 'verified';
    company.verifiedAt = new Date();
    company.verifiedBy = req.user._id;
    await company.save();

    // Promote admin user role to 'company' AND mark them as verified
    await User.findByIdAndUpdate(company.adminUser, {
      role: 'company',
      verificationStatus: 'verified',
    });

    // Notify company admin
    await createNotification(req.app, {
      recipientId: company.adminUser.toString(),
      type: 'company_approved',
      title: 'Company Approved',
      body: 'Your company registration has been approved. Please log out and log back in to access your Company Dashboard.',
      relatedId: company._id.toString(),
      relatedModel: 'Company',
    });

    await logActivity(req.user._id, 'company_approved', { companyId: company._id });

    return res.status(200).json({ success: true, company });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/companies/:id/reject  (admin only)
 */
async function rejectCompany(req, res, next) {
  try {
    const rejectionReason = req.body.rejectionReason || req.body.reason;

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }
    if (company.verificationStatus !== 'pending') {
      return res.status(409).json({ success: false, message: 'Company is not in a pending state.' });
    }

    company.verificationStatus = 'rejected';
    company.rejectionReason = rejectionReason;
    await company.save();

    // Sync user verificationStatus
    await User.findByIdAndUpdate(company.adminUser, { verificationStatus: 'rejected' });

    // Notify company admin
    await createNotification(req.app, {
      recipientId: company.adminUser.toString(),
      type: 'company_rejected',
      title: 'Company Registration Rejected',
      body: `Your company registration was rejected. Reason: ${rejectionReason}`,
      relatedId: company._id.toString(),
      relatedModel: 'Company',
    });

    await logActivity(req.user._id, 'company_rejected', { companyId: company._id, rejectionReason });

    return res.status(200).json({ success: true, company });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/companies/me  (authenticated — returns the company where adminUser = req.user._id)
 */
async function getMyCompany(req, res, next) {
  try {
    const company = await Company.findOne({
      adminUser: req.user._id,
      deletedAt: null,
    }).lean();

    if (!company) {
      return res.status(404).json({ success: false, message: 'No company found for this user.' });
    }

    return res.status(200).json({ success: true, company });
  } catch (err) {
    next(err);
  }
}

// ─── Profile & Public Listing ─────────────────────────────────────────────────

/**
 * PUT /api/companies/:id/profile
 */
async function updateCompanyProfile(req, res, next) {
  try {
    const { companyName, description, website, contactEmail, contactPhone, address, socialLinks } = req.body;

    // Validate website URL if provided
    if (website && !isValidUrl(website)) {
      return res.status(422).json({ success: false, message: 'Website must be a valid URL.' });
    }

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    // Only the company's adminUser can update the profile
    if (company.adminUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    // Upload logo if provided
    if (req.files && req.files.logo && req.files.logo[0]) {
      const logoResult = await uploadToCloudinary(req.files.logo[0].buffer, {
        folder: 'ethiogebiya/companies/branding',
        resource_type: 'image',
      });
      company.logo = logoResult.secure_url;
    }

    // Upload coverPhoto if provided
    if (req.files && req.files.coverPhoto && req.files.coverPhoto[0]) {
      const coverResult = await uploadToCloudinary(req.files.coverPhoto[0].buffer, {
        folder: 'ethiogebiya/companies/branding',
        resource_type: 'image',
      });
      company.coverPhoto = coverResult.secure_url;
    }

    if (companyName !== undefined) company.companyName = companyName;
    if (description !== undefined) company.description = description;
    if (website !== undefined) company.website = website;
    if (contactEmail !== undefined) company.contactEmail = contactEmail;
    if (contactPhone !== undefined) company.contactPhone = contactPhone;
    if (address !== undefined) company.address = address;
    if (socialLinks !== undefined) {
      const parsed = typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks;
      company.socialLinks = { ...company.socialLinks, ...parsed };
    }

    await company.save();

    return res.status(200).json({ success: true, company });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/companies  (public)
 */
async function listCompanies(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {
      verificationStatus: 'verified',
      isActive: true,
      deletedAt: null,
    };

    if (req.query.industry) {
      filter.industry = req.query.industry;
    }

    if (req.query.city) {
      filter.address = { $regex: req.query.city, $options: 'i' };
    }

    const [companies, total] = await Promise.all([
      Company.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Company.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      companies,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/companies/:id  (public)
 */
async function getCompanyById(req, res, next) {
  try {
    const company = await Company.findById(req.params.id).lean();
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    // Non-verified companies: only visible to admin or the company's own admin user
    if (company.verificationStatus !== 'verified') {
      const authed = req.user;
      const isOwner = authed && authed._id.toString() === company.adminUser.toString();
      const isAdmin = authed && authed.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(404).json({ success: false, message: 'Company not found.' });
      }
    }

    return res.status(200).json({ success: true, company });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/companies/:id/listings  (public)
 */
async function getCompanyListings(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {
      companyOwner: req.params.id,
      status: 'active',
      ownerType: 'company',
    };

    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate('category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Listing.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      listings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/companies/:id/contact
 */
async function submitContactInquiry(req, res, next) {
  try {
    const { name, phone, message } = req.body;

    if (message && message.length > 1000) {
      return res.status(422).json({ success: false, message: 'Message must not exceed 1000 characters.' });
    }

    const company = await Company.findById(req.params.id).lean();
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    await createNotification(req.app, {
      recipientId: company.adminUser.toString(),
      type: 'company_inquiry',
      title: 'New Company Inquiry',
      body: `${name} (${phone}): ${(message || '').slice(0, 100)}...`,
      relatedId: company._id.toString(),
      relatedModel: 'Company',
    });

    return res.status(200).json({ success: true, message: 'Inquiry submitted.' });
  } catch (err) {
    next(err);
  }
}

// ─── Admin Management ─────────────────────────────────────────────────────────

/**
 * PATCH /api/companies/:id/suspend  (admin)
 */
async function suspendCompany(req, res, next) {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    company.isActive = false;
    await company.save();

    // Bulk deactivate all active listings
    await Listing.updateMany(
      { companyOwner: company._id, status: 'active' },
      { $set: { status: 'inactive' } },
    );

    await logActivity(req.user._id, 'company_suspended', { companyId: company._id });

    return res.status(200).json({ success: true, company });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/companies/:id/reactivate  (admin)
 */
async function reactivateCompany(req, res, next) {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    company.isActive = true;
    await company.save();

    await logActivity(req.user._id, 'company_reactivated', { companyId: company._id });

    return res.status(200).json({ success: true, company });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/companies/:id  (admin)
 */
async function deleteCompany(req, res, next) {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    company.deletedAt = new Date();
    await company.save();

    // Soft-remove all associated listings
    await Listing.updateMany(
      { companyOwner: company._id },
      { $set: { status: 'removed' } },
    );

    await logActivity(req.user._id, 'company_deleted', { companyId: company._id });

    return res.status(200).json({ success: true, message: 'Company deleted.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/companies/admin  (admin)
 */
async function listCompaniesAdmin(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.verificationStatus) {
      filter.verificationStatus = req.query.verificationStatus;
    }

    const [companies, total] = await Promise.all([
      Company.find(filter)
        .populate('adminUser', 'fullName phone email location dateOfBirth createdAt')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Company.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      companies,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/companies/:id/audit-log  (admin)
 */
async function getCompanyAuditLog(req, res, next) {
  try {
    const company = await Company.findById(req.params.id).lean();
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    const logs = await ActivityLog.find({
      $or: [
        { 'metadata.companyId': req.params.id },
        { user: company.adminUser },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, logs });
  } catch (err) {
    next(err);
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  registerCompany,
  approveCompany,
  rejectCompany,
  getMyCompany,
  getCompanyById,
  listCompanies,
  getCompanyListings,
  updateCompanyProfile,
  submitContactInquiry,
  suspendCompany,
  reactivateCompany,
  deleteCompany,
  listCompaniesAdmin,
  getCompanyAuditLog,
};
