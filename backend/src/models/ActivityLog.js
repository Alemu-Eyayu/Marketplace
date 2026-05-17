const mongoose = require('mongoose');

const { Schema } = mongoose;

const activityLogSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
