const mongoose = require('mongoose');

const turnSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    default: '',
  },
  followUp: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const finalScoreSchema = new mongoose.Schema({
  clarity: {
    type: Number,
    min: 0,
    max: 10,
  },
  correctness: {
    type: Number,
    min: 0,
    max: 10,
  },
  structure: {
    type: Number,
    min: 0,
    max: 10,
  },
  overall: {
    type: Number,
    min: 0,
    max: 10,
  },
  edgeCases: {
    type: Number,
    min: 0,
    max: 10,
    default: 8,
  },
  seniorityFit: {
    type: String,
    default: 'Senior Engineer (L5)',
  },
  percentile: {
    type: Number,
    default: 88,
  },
  strongPoints: [{
    type: String,
  }],
  weakPoints: [{
    type: String,
  }],
  actionPlan: [{
    type: String,
  }],
  feedback: {
    type: String,
    default: '',
  },
}, { _id: false });

const interviewSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['dsa', 'system_design', 'behavioral'],
    required: true,
  },
  companyTier: {
    type: String,
    enum: ['faang', 'tier1', 'tier2', 'startup'],
    default: 'faang',
  },
  targetCompany: {
    type: String,
    default: 'Google / Meta / FAANG',
  },
  seniorityLevel: {
    type: String,
    enum: ['L3/L4 (Junior/Mid)', 'L5 (Senior)', 'L6+ (Staff/Principal)'],
    default: 'L5 (Senior)',
  },
  targetPackage: {
    type: String,
    default: '$250k - $380k',
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress',
  },
  maxTurns: {
    type: Number,
    default: 6,
  },
  tokenUsage: {
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
  },
  turns: [turnSchema],
  finalScore: {
    type: finalScoreSchema,
    default: null,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
});

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
