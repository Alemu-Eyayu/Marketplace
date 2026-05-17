const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function connectDB(retries = MAX_RETRIES) {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    if (retries > 0) {
      console.warn(`MongoDB connection failed. Retrying in ${RETRY_DELAY_MS}ms... (${retries} retries left)`);
      await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
      return connectDB(retries - 1);
    }
    console.error('MongoDB connection failed after all retries:', err.message);
    throw err;
  }
}

module.exports = connectDB;
