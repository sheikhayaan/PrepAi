const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    index: true,
  },
  passwordHash: {
    type: String,
    required: function () {
      return this.authProvider === 'local';
    },
  },
  googleId: {
    type: String,
    sparse: true,
    index: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
    index: true,
  },
  suspendedReason: {
    type: String,
    default: '',
  },
  suspendedAt: {
    type: Date,
    default: null,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationTokenHash: {
    type: String,
    default: null,
  },
  emailVerificationExpires: {
    type: Date,
    default: null,
  },
  passwordResetTokenHash: {
    type: String,
    default: null,
  },
  passwordResetExpires: {
    type: Date,
    default: null,
  },
  passwordResetUsed: {
    type: Boolean,
    default: false,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
    default: null,
  },
  twoFactorRecoveryCodes: {
    type: [String],
    default: [],
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lastFailedLoginAt: {
    type: Date,
    default: null,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
  lastLoginIp: {
    type: String,
    default: null,
  },
  loginHistory: [
    {
      timestamp: { type: Date, default: Date.now },
      ip: String,
      userAgent: String,
      success: Boolean,
    },
  ],
  aiUsage: {
    totalRequests: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    estimatedCostUsd: { type: Number, default: 0 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes for scaling and rapid query filtering
userSchema.index({ email: 1, role: 1, status: 1 });
userSchema.index({ status: 1, createdAt: -1 });

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
