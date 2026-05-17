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
      const user = await User.findById(_id).select('verificationStatus').lean();
      if (!user || user.verificationStatus !== 'verified') {
        return res.status(403).json({
          success: false,
          requiresVerification: true,
          message: 'Your account is pending admin verification. You will be able to create listings once verified.',
        });
      }
    }

    if (role === 'broker') {
      const user = await User.findById(_id).select('verificationStatus').lean();
      if (!user || user.verificationStatus !== 'verified') {
        return res.status(403).json({
          success: false,
          requiresVerification: true,
          message: 'Your broker account is pending admin approval. You will be able to create listings once approved.',
        });
      }
    }

    if (role === 'company') {
      const company = await Company.findOne({ adminUser: _id })
        .select('verificationStatus')
        .lean();
      if (!company || company.verificationStatus !== 'verified') {
        return res.status(403).json({
          success: false,
          requiresVerification: true,
          message: 'Your company registration is pending admin approval. You will be able to create listings once approved.',
        });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireApproved;
