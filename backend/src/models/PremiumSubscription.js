'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ── Pricing table ──────────────────────────────────────────────────────────────
// Price in ETB. Yearly = monthly × 10 (2-month discount).
// Tiers: basic=user, standard=broker, premium=company
// Category levels: low, medium, high
const PRICE_TABLE = {
  basic: {
    low:    { monthly: 50,   yearly: 500  },
    medium: { monthly: 100,  yearly: 1000 },
    high:   { monthly: 200,  yearly: 2000 },
  },
  standard: {
    low:    { monthly: 150,  yearly: 1500 },
    medium: { monthly: 300,  yearly: 3000 },
    high:   { monthly: 600,  yearly: 6000 },
  },
  premium: {
    low:    { monthly: 300,  yearly: 3000 },
    medium: { monthly: 600,  yearly: 6000 },
    high:   { monthly: 1200, yearly: 12000 },
  },
};

// Category → price level mapping
const CATEGORY_PRICE_LEVEL = {
  'real-estate':         'high',
  'automotive':          'high',
  'business-industrial': 'high',
  'professional-jobs':   'medium',
  'domestic-jobs':       'medium',
  'services':            'medium',
  'electronics':         'low',
  'home-furniture':      'low',
  'fashion-clothing':    'low',
  'sports-fitness':      'low',
  'books-media':         'low',
  'pets-animals':        'low',
  'agriculture':         'low',
};

// Role → price tier mapping
const ROLE_TIER = {
  user:    'basic',
  broker:  'standard',
  company: 'premium',
};

// Categories accessible per role
// All roles can subscribe to all categories — pricing tier differs by role.
const ROLE_ALLOWED_CATEGORIES = {
  user:    Object.keys(CATEGORY_PRICE_LEVEL),  // all categories, basic tier pricing
  broker:  Object.keys(CATEGORY_PRICE_LEVEL),  // all categories, standard tier pricing
  company: Object.keys(CATEGORY_PRICE_LEVEL),  // all categories, premium tier pricing
};

const premiumSubscriptionSchema = new Schema({
  user:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
  categorySlug:  { type: String, required: true },
  duration:      { type: String, enum: ['monthly', 'yearly'], required: true },
  paymentMethod: { type: String, enum: ['cbe', 'telebirr', 'mpesa', 'chapa'], required: true },
  receiptUrl:    { type: String, default: '' },
  fee:           { type: Number, required: true },
  status:        { type: String, enum: ['pending', 'active', 'inactive', 'expired'], default: 'pending' },
  startDate:     { type: Date },
  expiryDate:    { type: Date },
  activatedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  activatedAt:   { type: Date },
  deactivatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deactivatedAt: { type: Date },
  rejectedBy:    { type: Schema.Types.ObjectId, ref: 'User' },
  rejectedAt:    { type: Date },
  rejectionReason: { type: String },
  expiryNotified:  { type: Boolean, default: false },
  reminderNotified:{ type: Boolean, default: false },
  txRef:           { type: String },  // Chapa transaction reference
}, { timestamps: true });

premiumSubscriptionSchema.index({ user: 1, categorySlug: 1, status: 1 });
premiumSubscriptionSchema.index({ status: 1, createdAt: -1 });
premiumSubscriptionSchema.index({ expiryDate: 1, status: 1 });

module.exports = mongoose.model('PremiumSubscription', premiumSubscriptionSchema);
module.exports.PRICE_TABLE = PRICE_TABLE;
module.exports.CATEGORY_PRICE_LEVEL = CATEGORY_PRICE_LEVEL;
module.exports.ROLE_TIER = ROLE_TIER;
module.exports.ROLE_ALLOWED_CATEGORIES = ROLE_ALLOWED_CATEGORIES;
