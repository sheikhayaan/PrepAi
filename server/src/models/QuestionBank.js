const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['dsa', 'system_design', 'behavioral'],
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
  },
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

module.exports = mongoose.model('QuestionBank', questionBankSchema);
