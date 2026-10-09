'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const companySchema = new Schema({
  // Identity
  companyName:                { type: String, required: true },
  businessRegistrationNumber: { type: String, required: true, unique: true },
  businessRegistrationDoc:    { type: String, required: true }, // Cloudinary URL
  industry:                   { type: String, required: true },

  // Contact
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  website:      String,
  address:      String,
  foundedDate:  Date,

  // Branding
  logo:        String, // Cloudinary URL
  coverPhoto:  String, // Cloudinary URL
  description: String,
  socialLinks: {
    facebook:  String,
    twitter:   String,
    instagram: String,
    linkedin:  String,
  },

  // Ownership — the User who registered and administers this company
  adminUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  // Verification lifecycle
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  rejectionReason: String,
  verifiedAt:      Date,
  verifiedBy:      { type: Schema.Types.ObjectId, ref: 'User' },

  // Operational state
  isActive:  { type: Boolean, default: true },
  deletedAt: Date, // soft-delete timestamp
}, { timestamps: true });

companySchema.index({ verificationStatus: 1 });
companySchema.index({ industry: 1 });
companySchema.index({ isActive: 1, verificationStatus: 1 });
companySchema.index({ companyName: 'text', description: 'text', industry: 'text' });

module.exports = mongoose.model('Company', companySchema);
