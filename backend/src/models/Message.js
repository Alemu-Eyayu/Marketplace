const mongoose = require('mongoose');

const { Schema } = mongoose;

const messageSchema = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  body: String,
  attachment: String,
  isRead: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
