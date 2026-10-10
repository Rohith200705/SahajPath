// Adaptive (A+C) loop + figure description controllers.
const Job = require("../models/Job");
const ai = require("../services/aiClient");

// Student submits their answer to a job's comprehension check.
// We grade it, adapt the reading level, and (if wrong) re-simplify the lesson.
exports.evaluate = async (req, res) => {
  try {
    const { jobId, studentAnswer } = req.body;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (!job.comprehensionCheck)
      return res.status(400).json({ error: "No comprehension check for this job" });

    const result = await ai.evaluateAnswer(
      job.comprehensionCheck,
      studentAnswer,
      job.options.readingLevel
    );

    // Apply the adapted level.
    job.options.readingLevel = result.newLevel;

    // If they got it wrong, re-explain the SAME lesson more simply.
    let reexplained = null;
    if (result.shouldReexplain && job.originalText) {
      reexplained = await ai.simplify(job.originalText, result.newLevel);
      job.simplifiedText = reexplained;
      // Fresh check at the new level.
      job.comprehensionCheck = await ai.comprehensionCheck(
        reexplained,
        job.options.targetLanguage || "en"
      );
    }
    await job.save();

    res.json({ ...result, reexplainedText: reexplained, newCheck: job.comprehensionCheck });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Describe an uploaded figure/diagram aloud for a blind learner.
exports.describeFigure = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded (field 'file')" });
    const description = await ai.describeFigure({
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      lang: req.body.lang || "en",
      context: req.body.context || "",
    });

    let audioUrl = null;
    if (req.body.speak !== "false") {
      const cfg = require("../config");
      const filename = await ai.tts(description, req.body.lang || "en");
      audioUrl = `${cfg.NODE_BASE_URL}/api${cfg.AUDIO_PUBLIC_PATH}/${filename}`;
    }
    res.json({ description, audioUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
