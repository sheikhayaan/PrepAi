/**
 * Per-question calibration statistics (Loop A).
 *
 * `difficulty` and `discrimination` are on an Elo-like scale:
 *   difficulty  ~ item "b" rating (1300 easy ... 1700 hard)
 *   discrimination ~ how strongly the item separates strong/weak candidates
 *
 * Updated off the request path by the learning scheduler, never by the hot
 * answer path, so a slow aggregation can never delay a stream.
 */
const mongoose = require('mongoose');

const questionStatSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
    required: true,
    unique: true,
  },
  type: {
    type: String,
    required: true,
    index: true,
  },
  difficulty: {
    type: Number,
    default: 1450,
  },
  discrimination: {
    type: Number,
    default: 1,
    min: 0,
    max: 3,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  correct: {
    type: Number,
    default: 0,
  },
  scoreSum: {
    type: Number,
    default: 0,
  },
  scoreCount: {
    type: Number,
    default: 0,
  },
  exposureCount: {
    type: Number,
    default: 0,
  },
  exposureWindowStart: {
    type: Date,
    default: Date.now,
  },
  exposureWindowCount: {
    type: Number,
    default: 0,
  },
  topicTags: [{ type: String }],
  lastCalibratedAt: { type: Date, default: null },
  calibrationVersion: { type: String, default: 'static-v1' },
}, { timestamps: true });

questionStatSchema.index({ type: 1, difficulty: 1 });
questionStatSchema.index({ type: 1, exposureWindowStart: -1 });

module.exports = mongoose.model('QuestionStat', questionStatSchema);
