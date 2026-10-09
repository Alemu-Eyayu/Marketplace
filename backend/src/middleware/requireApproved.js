'use strict';

/**
 * requireApproved middleware
 *
 * Blocks brokers and company users from creating listings
 * until an admin has approved them.
 *
 * - broker  → User.verificationStatus must be 'verified'
 * - company → the Company owned by this user must have verificationStatus 'verified'
 *
 * Must be used AFTER the `authenticate` middleware so req.user is populated.
 */

const User = require('../models/User');
const Company = require('../models/Company');

async function requireApproved(req, res, next) {
  try {
    const { _id, role } = req.user;

    // Admins bypass all checks
    if (role === 'admin') return next();

    if (role === 'user') {
      const user = await User.findById(_id).select('verificationStatus isPhoneVerified').lean();
      if (!user || !user.isPhoneVerified) {
        return res.status(403).json({
          success: false,
          message: 'Phone verification required. Please verify your phone number first.',
        });
      }
      if (user.verificationStatus !== 'verified') {
        return res.status(403).json({
          success: false,
          requiresVerification: true,
          message: 'Your account is pending admin verification. You will be able to create listings once verified.',
        });
      }
    }

    if (role === 'broker') {
      const user = await User.findById(_id).select('verificationStatus isPhoneVerified').lean();
      if (!user || !user.isPhoneVerified) {
        return res.status(403).json({
          success: false,
          message: 'Phone verification required. Please verify your phone number first.',
        });
      }
      if (user.verificationStatus !== 'verified') {
        return res.status(403).json({
          success: false,
          requiresVerification: true,
          message: 'Your broker account is pending admin approval. You will be able to create listings once approved.',
        });
      }
    }

    if (role === 'company') {
      // Sort by createdAt desc so the most recent registration is checked first.
      // Also exclude soft-deleted companies.
      const company = await Company.findOne({ adminUser: _id, deletedAt: null })
        .select('verificationStatus')
        .sort({ createdAt: -1 })
        .lean();
      if (!company) {
        return res.status(403).json({
          success: false,
          requiresVerification: true,
          message: 'No company registration found. Please register your company first.',
        });
      }
      if (company.verificationStatus !== 'verified') {
        const statusMsg = company.verificationStatus === 'rejected'
          ? 'Your company registration was rejected. Please contact support.'
          : 'Your company registration is pending admin approval. You will be able to create listings once your company is verified.';
        return res.status(403).json({
          success: false,
          requiresVerification: true,
          message: statusMsg,
        });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireApproved;
