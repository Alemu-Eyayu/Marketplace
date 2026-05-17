'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const companyMemberSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  user:    { type: Schema.Types.ObjectId, ref: 'User', required: true },

  // Role within the company
  memberRole: {
    type: String,
    enum: ['editor', 'viewer'],
    default: 'viewer',
  },

  // Invitation lifecycle
  status: {
    type: String,
    enum: ['pending', 'active', 'declined', 'removed'],
    default: 'pending',
  },

  invitedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  invitedAt:   { type: Date, default: Date.now },
  respondedAt: Date,
}, { timestamps: true });

companyMemberSchema.index({ company: 1, status: 1 });
companyMemberSchema.index({ user: 1, status: 1 });
companyMemberSchema.index({ company: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('CompanyMember', companyMemberSchema);
