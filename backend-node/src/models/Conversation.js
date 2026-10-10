const mongoose = require("mongoose");

// Per-lesson conversation memory — the "memory base" for grounded chat.
// Keyed by the lesson's Job id; stores the running message history.
const conversationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", index: true },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"] },
        text: String,
        lang: String,
        audioUrl: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
