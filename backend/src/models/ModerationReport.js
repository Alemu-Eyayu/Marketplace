const mongoose = require('mongoose');

const { Schema } = mongoose;

const moderationReportSchema = new Schema({
  reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['listing', 'message'], required: true },
  targetId:   { type: Schema.Types.ObjectId, required: true },
  reason:     { type: String, required: true },
  status:     { type: String, enum: ['open', 'actioned', 'dismissed'], default: 'open' },

  // Specific action the admin chose
  actionType: {
    type: String,
    enum: ['warn_owner', 'remove_listing', 'suspend_owner', 'dismiss'],
  },

  // Optional free-text note from the admin
  adminNote: { type: String },

  // Which admin resolved this report
  actionBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  actionAt:   { type: Date },
}, { timestamps: true });

// Index for fast lookup of all reports against a specific target
moderationReportSchema.index({ targetType: 1, targetId: 1 });
moderationReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ModerationReport', moderationReportSchema);
