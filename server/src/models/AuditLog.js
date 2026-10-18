const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  userName: {
    type: String,
    default: 'System / Anonymous',
  },
  userEmail: {
    type: String,
    default: '',
  },
  userRole: {
    type: String,
    enum: ['admin', 'user', 'system'],
    default: 'user',
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  resource: {
    type: String,
    required: true,
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true,
    index: true,
  },
  ip: {
    type: String,
    default: '127.0.0.1',
  },
  userAgent: {
    type: String,
    default: 'unknown',
  },
  requestId: {
    type: String,
    default: '',
    index: true,
  },
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success',
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound indexes for rapid query & filtering
auditLogSchema.index({ timestamp: -1, action: 1 });
auditLogSchema.index({ targetUserId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
