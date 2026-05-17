const mongoose = require('mongoose');

const { Schema } = mongoose;

const notificationSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  title: String,
  body: String,
  isRead: { type: Boolean, default: false },
  relatedId: Schema.Types.ObjectId,
  relatedModel: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
