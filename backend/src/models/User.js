const mongoose = require('mongoose');

const { Schema } = mongoose;

const premiumSubscriptionSchema = new Schema({
  isActive: { type: Boolean, default: false },
  plan: String,
  startDate: Date,
  renewalDate: Date,
  paymentMethod: String,
  cancelAtRenewal: { type: Boolean, default: false },
}, { _id: false });

const userSchema = new Schema({
  phone: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'broker', 'admin', 'company'], required: true },
  isPhoneVerified: { type: Boolean, default: false },
  verificationStatus: { type: String, enum: ['none', 'pending', 'verified', 'rejected'], default: 'none' },
  verificationDoc: String,
  businessLicense: String,
  businessLicenseDoc: String,
  licenseType: String,
  specializations: [String],
  email: String,
  website: String,
  dateOfBirth: Date,
  profilePhoto: String,
  location: String,
  city: String,
  region: String,
  bio: String,
  preferredLanguage: { type: String, enum: ['en', 'am'], default: 'en' },
  isActive: { type: Boolean, default: true },
  blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  premiumSubscription: { type: premiumSubscriptionSchema, default: () => ({}) },
  hasUsedFreeTrial: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      sms:   { type: Boolean, default: false },
      push:  { type: Boolean, default: true },
    },
    privacy: {
      profileVisible:  { type: Boolean, default: true },
      showContactInfo: { type: Boolean, default: false },
    },
    preferences: {
      language: { type: String, enum: ['en', 'am'], default: 'en' },
      timezone: { type: String, default: 'Africa/Addis_Ababa' },
    },
    // broker-specific
    broker: {
      commissionRate:     { type: Number, default: 5.0, min: 0, max: 100 },
      autoAcceptListings: { type: Boolean, default: false },
      autoRenewListings:  { type: Boolean, default: false },
      allowNegotiation:   { type: Boolean, default: true },
    },
    // regular user-specific
    user: {
      saveSearchHistory: { type: Boolean, default: true },
      maxBudget:         { type: Number, default: 0 },
    },
  },
}, { timestamps: true });

userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
