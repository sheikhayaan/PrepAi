/**
 * Per-user, per-track ability estimate (Loop A).
 *
 * Elo-style (mean 1500, 400-point scale). Bounded history keeps documents small
 * and avoids unbounded arrays for power users.
 */
const mongoose = require('mongoose');

const userAbilitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
  },
  ability: {
    type: Number,
    default: 1500,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  recentScores: {
    type: [Number],
    default: [],
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

userAbilitySchema.index({ userId: 1, type: 1 }, { unique: true });

userAbilitySchema.pre('save', function trimHistory(next) {
  if (Array.isArray(this.recentScores) && this.recentScores.length > 20) {
    this.recentScores = this.recentScores.slice(-20);
  }
  next();
});

module.exports = mongoose.model('UserAbility', userAbilitySchema);
