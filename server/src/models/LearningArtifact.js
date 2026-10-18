/**
 * Versioned learning artifacts (rubric offsets, readiness weights, selection
 * policy, prompt evaluation results).
 *
 * Guardrails enforced by schema + service layer:
 *  - Only one `active` artifact per `kind` (partial unique index below).
 *  - Promotion requires explicit human approval (`approvedBy`).
 *  - Every promotion/rollback writes an AuditLog entry.
 *  - Old versions are archived, never deleted, so rollback is always possible.
 */
const mongoose = require('mongoose');

const learningArtifactSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: ['rubric_calibration', 'readiness_weights', 'selection_policy', 'prompt_evaluation'],
    required: true,
  },
  version: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['proposed', 'shadow', 'canary', 'active', 'rolled_back', 'archived'],
    default: 'proposed',
    index: true,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  metrics: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  sampleSize: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  promotedAt: { type: Date, default: null },
  rolledBackAt: { type: Date, default: null },
}, { timestamps: true });

learningArtifactSchema.index({ kind: 1, version: 1 }, { unique: true });
// Database-level guarantee: at most one active version per artifact kind.
learningArtifactSchema.index(
  { kind: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
learningArtifactSchema.index({ kind: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('LearningArtifact', learningArtifactSchema);
