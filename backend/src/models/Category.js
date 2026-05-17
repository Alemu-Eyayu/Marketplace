const mongoose = require('mongoose');

const { Schema } = mongoose;

const requiredFieldSchema = new Schema({
  key: { type: String, required: true },
  label: {
    en: String,
    am: String,
  },
  type: { type: String, enum: ['string', 'number', 'enum', 'boolean'], required: true },
  options: [String],
  required: { type: Boolean, default: false },
}, { _id: false });

const categorySchema = new Schema({
  name: {
    en: { type: String, required: true },
    am: { type: String, required: true },
  },
  slug: { type: String, required: true, unique: true },
  requiredFields: [requiredFieldSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
