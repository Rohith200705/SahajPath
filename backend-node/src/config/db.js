const mongoose = require("mongoose");
const cfg = require("./index");

async function connectDB() {
  if (!cfg.MONGODB_URI) {
    console.warn("⚠️  No MONGODB_URI set — DB features disabled.");
    return;
  }
  try {
    await mongoose.connect(cfg.MONGODB_URI, { dbName: cfg.MONGODB_DB_NAME });
    console.log(`✅ MongoDB connected (db: ${cfg.MONGODB_DB_NAME})`);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
}

module.exports = connectDB;
