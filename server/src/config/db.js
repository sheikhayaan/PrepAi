const mongoose = require('mongoose');
const config = require('./env');
const { ensureIndexes } = require('./indexes');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongo.uri, {
      minPoolSize: config.mongo.minPoolSize,
      maxPoolSize: config.mongo.maxPoolSize,
      socketTimeoutMS: config.mongo.socketTimeoutMS,
      serverSelectionTimeoutMS: config.mongo.serverSelectionTimeoutMS,
      autoIndex: !config.isProduction,
    });
    console.log(
      `MongoDB Connected: ${conn.connection.host} [Pool: ${config.mongo.minPoolSize}-${config.mongo.maxPoolSize}]`
    );
    // Do not block the first request on index creation, but do guarantee the
    // indexes that enforce learning-loop invariants exist.
    ensureIndexes().catch((error) =>
      console.error(`Index bootstrap failed: ${error.message}`)
    );
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (config.isProduction) {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
