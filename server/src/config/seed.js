require('dotenv').config();
const mongoose = require('mongoose');
const QuestionBank = require('../models/QuestionBank');
const connectDB = require('./db');
const questions = require('./curatedQuestions.json');

const seedQuestions = async () => {
  try {
    await connectDB();
    console.log('Clearing existing QuestionBank...');
    await QuestionBank.deleteMany();

    console.log(`Seeding ${questions.length} questions across all 8 interview types with complete model answers...`);
    await QuestionBank.insertMany(questions);

    console.log(`✅ QuestionBank successfully seeded with ${questions.length} questions, company tags, all 8 tracks, and full model answers!`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding questions:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  seedQuestions();
}

module.exports = { questions, seedQuestions };
