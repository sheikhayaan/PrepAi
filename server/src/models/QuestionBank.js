const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema({
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
    index: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
  },
  level: {
    type: String,
    enum: ['L3', 'L4', 'L5', 'L6+'],
    default: 'L4',
    index: true,
  },
  companyTags: [{
    type: String,
    index: true,
  }],
  prompt: {
    type: String,
    required: true,
  },
  tags: [{
    type: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

questionBankSchema.index({ type: 1, level: 1 });
questionBankSchema.index({ companyTags: 1, type: 1 });

module.exports = mongoose.model('QuestionBank', questionBankSchema);
