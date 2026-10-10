// Lesson library + conversation history — the browsable "memory base".
const Job = require("../models/Job");
const Conversation = require("../models/Conversation");

// List past lessons for the library/home page (newest first).
exports.listLessons = async (req, res) => {
  try {
    const jobs = await Job.find({ status: "done" })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("originalText simplifiedText options inputType createdAt");
    const lessons = jobs.map((j) => ({
      id: j._id,
      title: (j.simplifiedText || j.originalText || "Untitled lesson")
        .replace(/\s+/g, " ")
        .slice(0, 60),
      inputType: j.inputType,
      language: j.options?.targetLanguage,
      createdAt: j.createdAt,
    }));
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Full conversation history for a lesson.
exports.getConversation = async (req, res) => {
  try {
    const convo = await Conversation.findOne({ jobId: req.params.jobId });
    res.json({ jobId: req.params.jobId, messages: convo ? convo.messages : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
