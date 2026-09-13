require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function updateRoles() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/prepai');
  const result = await User.updateMany({}, { role: 'admin' });
  console.log('Successfully updated existing accounts to admin:', result);
  const users = await User.find({}, 'name email role');
  console.log('Current users in DB:', users);
  process.exit(0);
}

updateRoles();
