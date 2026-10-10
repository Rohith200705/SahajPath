const mongoose = require("mongoose");

// A Job = one lesson a student submitted + all its transformed outputs.
// originalText is stored so the chat ("talk to your lesson") can be grounded to it.
const jobSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "processing", "done", "error"],
      default: "pending",
    },
    inputType: String, // text | image | pdf | webpage
    options: {
      simplify: { type: Boolean, default: true },
      readingLevel: { type: Number, default: 2 }, // drives the A+C adaptive loop
      targetLanguage: { type: String, default: "hi" },
      generateAudio: { type: Boolean, default: true },
    },
    originalText: String,
    simplifiedText: String,
    translatedText: String,
    audioFilename: String,
    comprehensionCheck: String, // JSON string from the LLM
    // RULE 01/04 — extraction structure + explainability
    blocks: { type: Array, default: [] }, // [{text, bbox:[x,y,w,h], confidence, page}]
    meanConfidence: Number, // 0-100 (null for exact digital text)
    lowConfidence: { type: Boolean, default: false },
    warnings: { type: [String], default: [] },
    error: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
