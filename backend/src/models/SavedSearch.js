const mongoose = require('mongoose');

const { Schema } = mongoose;

const savedSearchSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  params: {
    q: String,
    category: String,
    minPrice: Number,
    maxPrice: Number,
    region: String,
    lat: Number,
    lng: Number,
    radius: Number,
  },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
