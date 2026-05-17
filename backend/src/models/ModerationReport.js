const mongoose = require('mongoose');

const { Schema } = mongoose;

const moderationReportSchema = new Schema({
  reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['listing', 'message'], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['open', 'actioned', 'dismissed'], default: 'open' },
  actionTaken: String,
  actionBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ModerationReport', moderationReportSchema);
