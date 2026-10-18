const mongoose = require('mongoose');

const turnScoreSchema = new mongoose.Schema({
  overall: {
    type: Number,
    min: 0,
    max: 10,
    default: null,
  },
  dimensionScores: {
    type: Map,
    of: Number,
    default: () => new Map(),
  },
  topicTags: [{
    type: String,
    trim: true,
  }],
  reasoning: {
    type: String,
    default: '',
    trim: true,
  },
}, { _id: false });

const turnSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
    default: null,
  },
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
  turnScore: {
    type: turnScoreSchema,
    default: null,
  },
});

const finalScoreSchema = new mongoose.Schema({
  // Technical / DSA / System Design / Behavioral
  clarity: { type: Number, min: 0, max: 10 },
  correctness: { type: Number, min: 0, max: 10 },
  structure: { type: Number, min: 0, max: 10 },
  edgeCases: { type: Number, min: 0, max: 10 },

  // HR Round
  communication: { type: Number, min: 0, max: 10 },
  culture_fit: { type: Number, min: 0, max: 10 },
  honesty_consistency: { type: Number, min: 0, max: 10 },

  // Case Study
  structuring: { type: Number, min: 0, max: 10 },
  hypothesis_driven_thinking: { type: Number, min: 0, max: 10 },
  quantitative_reasoning: { type: Number, min: 0, max: 10 },

  // Product Management
  user_empathy: { type: Number, min: 0, max: 10 },
  prioritization: { type: Number, min: 0, max: 10 },
  metrics_thinking: { type: Number, min: 0, max: 10 },

  // Sales Pitch
  persuasiveness: { type: Number, min: 0, max: 10 },
  objection_handling: { type: Number, min: 0, max: 10 },

  // Managerial
  conflict_resolution: { type: Number, min: 0, max: 10 },
  delegation_reasoning: { type: Number, min: 0, max: 10 },
  leadership_judgment: { type: Number, min: 0, max: 10 },

  // Common Meta Evaluation
  overall: {
    type: Number,
    min: 0,
    max: 10,
  },
  seniorityFit: {
    type: String,
    default: 'Senior Level (L5)',
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
}, { _id: false, strict: false });

const interviewSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'dsa',
      'system_design',
      'behavioral',
      'hr_round',
      'case_study',
      'product_management',
      'sales_pitch',
      'managerial',
    ],
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
    default: 'L5 (Senior)',
  },
  targetPackage: {
    type: String,
    default: '$250k - $380k',
  },
  customConfig: {
    role: { type: String, trim: true },
    targetCompany: { type: String, trim: true },
    region: { type: String, enum: ['india', 'us'] },
    targetSalary: { type: Number },
    currency: { type: String, enum: ['INR', 'USD'] },
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
  // Version stamps make every score reproducible and let the learning loops
  // compare/rollback rubric, prompt, readiness-weight and selection policies.
  rubricVersion: { type: String, default: null },
  promptVersion: { type: String, default: null },
  weightsVersion: { type: String, default: null },
  selectionPolicyVersion: { type: String, default: null },
  abilityEstimateAtStart: { type: Number, default: null },
  correlationId: { type: String, default: null },
  // Idempotency marker for answer submission retries/reconnects. A duplicate
  // answer must never be scored twice or overwrite the next question.
  lastAnswerHash: { type: String, default: null },
  lastAnswerAt: { type: Date, default: null },
  lastStreamKey: { type: String, default: null },
  turns: [turnSchema],
  finalScore: {
    type: finalScoreSchema,
    default: null,
  },
  startedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  completedAt: {
    type: Date,
  },
});

// High-concurrency compound indexes for admin dashboards and user analytics
interviewSessionSchema.index({ userId: 1, startedAt: -1 });
interviewSessionSchema.index({ status: 1, startedAt: -1 });
interviewSessionSchema.index({ companyTier: 1, seniorityLevel: 1 });
interviewSessionSchema.index({ 'finalScore.overall': -1 });
interviewSessionSchema.index({ rubricVersion: 1, completedAt: -1 });
interviewSessionSchema.index({ correlationId: 1 });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);

