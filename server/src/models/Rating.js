const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  userName: {
    type: String,
    default: 'Candidate',
  },
  userEmail: {
    type: String,
    default: '',
  },
  userAvatar: {
    type: String,
    default: '',
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
  },
  featureUsed: {
    type: String,
    default: 'faang_mock_interview',
    index: true,
  },
  rating: {
    type: Number,
    required: [true, 'Rating score is required'],
    min: 1,
    max: 5,
    index: true,
  },
  categories: {
    ai_voice_quality: { type: Number, default: 5 },
    question_depth: { type: Number, default: 5 },
    scoring_accuracy: { type: Number, default: 5 },
    latency_speed: { type: Number, default: 5 },
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: '',
  },
  companyTier: {
    type: String,
    default: 'faang',
  },
  seniorityLevel: {
    type: String,
    default: 'L5 (Senior)',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

ratingSchema.index({ createdAt: -1, rating: -1 });

module.exports = mongoose.model('Rating', ratingSchema);
