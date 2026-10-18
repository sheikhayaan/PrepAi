/**
 * Human-anchored calibration feedback (Loop B).
 *
 * AI-only feedback must never be used to calibrate the rubric. Every row here
 * is either an explicit human override or a post-session CSAT/quality signal.
 */
const mongoose = require('mongoose');

const calibrationFeedbackSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  type: {
    type: String,
    required: true,
    index: true,
  },
  source: {
    type: String,
    enum: ['human_override', 'reviewer', 'csat'],
    required: true,
  },
  dimension: {
    type: String,
    required: true,
  },
  aiScore: {
    type: Number,
    min: 0,
    max: 10,
    required: true,
  },
  humanScore: {
    type: Number,
    min: 0,
    max: 10,
    required: true,
  },
  weight: {
    type: Number,
    default: 1,
    min: 0,
    max: 10,
  },
  comment: {
    type: String,
    default: '',
    maxlength: 2000,
  },
}, { timestamps: true });

calibrationFeedbackSchema.index({ type: 1, dimension: 1, createdAt: -1 });
calibrationFeedbackSchema.index({ source: 1, createdAt: -1 });

module.exports = mongoose.model('CalibrationFeedback', calibrationFeedbackSchema);
