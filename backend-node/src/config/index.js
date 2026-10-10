// Loads config from the shared/.env file (one source of truth for both services).
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../shared/.env") });

module.exports = {
  NODE_PORT: process.env.NODE_PORT || 5000,
  NODE_BASE_URL: process.env.NODE_BASE_URL || "http://localhost:5000",
  PYTHON_AI_URL: process.env.PYTHON_AI_URL || "http://localhost:8000",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || "sahajpath",
  INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET || "",
  AUDIO_PUBLIC_PATH: process.env.AUDIO_PUBLIC_PATH || "/media/audio",
  MAX_UPLOAD_MB: parseInt(process.env.MAX_UPLOAD_MB || "25", 10),
  SUPPORTED_LANGUAGES: (process.env.SUPPORTED_LANGUAGES || "en,hi,ta").split(","),
  DEFAULT_OUTPUT_LANGUAGE: process.env.DEFAULT_OUTPUT_LANGUAGE || "hi",
};
