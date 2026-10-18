const mongoose = require('mongoose');

const securityAlertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'SUSPICIOUS_IP',
      'BRUTE_FORCE_ATTEMPT',
      'RATE_LIMIT_BREACH',
      'HIGH_ERROR_RATE',
      'UNAUTHORIZED_ADMIN_ACCESS',
      'UNUSUAL_AI_BURST',
      'PROMPT_INJECTION_BLOCKED',
    ],
    required: true,
    index: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true,
  },
  message: {
    type: String,
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ip: {
    type: String,
    default: '127.0.0.1',
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true,
  },
  userEmail: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'investigating', 'resolved', 'dismissed'],
    default: 'active',
    index: true,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  resolvedByName: {
    type: String,
    default: '',
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
  resolutionNotes: {
    type: String,
    default: '',
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

securityAlertSchema.index({ status: 1, severity: 1, timestamp: -1 });

module.exports = mongoose.model('SecurityAlert', securityAlertSchema);
