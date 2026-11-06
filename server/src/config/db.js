const mongoose = require('mongoose');
const config = require('./env');
const { ensureIndexes } = require('./indexes');

const connectDB = async (retries = 3) => {
  const isSrv = config.mongo.uri.startsWith('mongodb+srv://');
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(config.mongo.uri, {
        ...(isSrv ? {} : { directConnection: true }),
        minPoolSize: config.mongo.minPoolSize,
        maxPoolSize: config.mongo.maxPoolSize,
        socketTimeoutMS: config.mongo.socketTimeoutMS,
        serverSelectionTimeoutMS: 10000,
        autoIndex: !config.isProduction,
      });
      console.log(
        `MongoDB Connected: ${conn.connection.host} [Pool: ${config.mongo.minPoolSize}-${config.mongo.maxPoolSize}]`
      );
      ensureIndexes().catch((error) =>
        console.error(`Index bootstrap failed: ${error.message}`)
      );

      // Auto-bootstrap & sync QuestionBank if empty or updated
      const QuestionBank = require('../models/QuestionBank');
      const { questions } = require('./seed');
      QuestionBank.countDocuments()
        .then(async (count) => {
          if (count < questions.length) {
            console.log(`QuestionBank has ${count} items. Syncing with ${questions.length} rich curated questions with full model answers...`);
            await QuestionBank.deleteMany({});
            await QuestionBank.insertMany(questions);
            console.log(`✅ QuestionBank synced successfully with ${questions.length} curated questions!`);
          } else {
            console.log(`QuestionBank verified: ${count} questions active.`);
          }
        })
        .catch((err) => console.error(`QuestionBank auto-seed check failed: ${err.message}`));

      return conn;
    } catch (error) {
      console.error(`MongoDB Connection Attempt ${attempt}/${retries} Error: ${error.message}`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000));
      } else if (config.isProduction) {
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;
