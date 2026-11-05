const mongoose = require('mongoose');
const config = require('./env');
const { ensureIndexes } = require('./indexes');

const connectDB = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(config.mongo.uri, {
        directConnection: true,
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
