// "Talk to your lesson" — grounded, voice-friendly chat with per-lesson memory.
const Job = require("../models/Job");
const Conversation = require("../models/Conversation");
const ai = require("../services/aiClient");
const cfg = require("../config");

exports.ask = async (req, res) => {
  try {
    const { jobId, question, answerLanguage, speak } = req.body;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (!job.originalText)
      return res.status(400).json({ error: "Lesson not ready yet" });

    const lang = answerLanguage || job.options.targetLanguage || "en";

    // Load (or create) this lesson's conversation memory.
    let convo = await Conversation.findOne({ jobId });
    if (!convo) convo = await Conversation.create({ jobId, messages: [] });
    const history = convo.messages.map((m) => ({ role: m.role, text: m.text }));

    // Answer strictly from the lesson (RAG retrieval happens in the AI service),
    // using recent history for follow-up context.
    const answer = await ai.chat(question, job.originalText, lang, history);

    // Optionally voice the answer back (hands-free use).
    let audioUrl = null;
    if (speak !== false) {
      try {
        const filename = await ai.tts(answer, lang);
        audioUrl = `${cfg.NODE_BASE_URL}/api${cfg.AUDIO_PUBLIC_PATH}/${filename}`;
      } catch { /* audio optional */ }
    }

    // Persist both turns to memory.
    convo.messages.push({ role: "user", text: question, lang });
    convo.messages.push({ role: "assistant", text: answer, lang, audioUrl });
    await convo.save();

    res.json({ answer, audioUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
