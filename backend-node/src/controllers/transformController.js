// Orchestrates the SahajPath pipeline: extract -> simplify -> translate -> TTS.
// Runs async: respond with jobId immediately, process in the background, frontend polls.
const Job = require("../models/Job");
const ai = require("../services/aiClient");
const cfg = require("../config");

// Preview + chunk: extract text WITHOUT running the slow LLM pipeline, then split
// long content into transformable chunks so the user can pick one (keeps each
// transform small and fast — avoids the long-content polling timeout).
const CHUNK_CHARS = 1200;
const NEEDS_CHUNKING_OVER = 1500;

function splitIntoChunks(text, size = CHUNK_CHARS) {
  const words = (text || "").split(/\s+/);
  const chunks = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).length > size && cur) {
      chunks.push(cur.trim());
      cur = w;
    } else {
      cur += (cur ? " " : "") + w;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

exports.preview = async (req, res) => {
  try {
    const inputType = req.body.inputType || (req.file ? "image" : "text");
    const ext = await ai.extract({
      inputType,
      content: req.body.content,
      fileBuffer: req.file ? req.file.buffer : null,
      fileName: req.file ? req.file.originalname : null,
    });
    const text = ext.text || "";
    if (!text) return res.status(422).json({ error: "No text could be extracted." });

    const chunks = splitIntoChunks(text);
    res.json({
      totalChars: text.length,
      needsChunking: text.length > NEEDS_CHUNKING_OVER && chunks.length > 1,
      warnings: ext.warnings || [],
      chunks: chunks.map((c, i) => ({
        index: i,
        chars: c.length,
        preview: c.slice(0, 140),
        text: c,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

async function runPipeline(jobId, { inputType, content, fileBuffer, fileName }) {
  const job = await Job.findById(jobId);
  try {
    job.status = "processing";
    await job.save();

    // 1. EXTRACT — any input -> clean text + structure (bboxes, confidence)
    const ext = await ai.extract({ inputType, content, fileBuffer, fileName });
    const original = ext.text;
    job.originalText = original;
    job.blocks = ext.blocks || [];
    job.meanConfidence = ext.meanConfidence;
    job.lowConfidence = !!ext.lowConfidence;
    job.warnings = ext.warnings || [];
    // RULE 06 — graceful handling: if extraction is empty, fail clearly, don't push junk downstream.
    if (!original) {
      job.status = "error";
      job.error = "No text could be extracted from the input.";
      await job.save();
      return;
    }
    await job.save();

    // 2. SIMPLIFY (source language first — best LLM quality)
    let working = original;
    if (job.options.simplify) {
      working = await ai.simplify(original, job.options.readingLevel);
      job.simplifiedText = working;
      await job.save();
    }

    // 3. TRANSLATE (now translating already-simple text). Degrade gracefully:
    // if the model returns empty, keep the simplified text and warn (RULE 06).
    const target = job.options.targetLanguage;
    if (target && target !== "en") {
      try {
        const t = await ai.translate(working, target);
        if (t && t.trim()) {
          working = t;
          job.translatedText = t;
        } else {
          job.warnings = [...(job.warnings || []), "Translation came back empty; showing English."];
        }
      } catch (e) {
        job.warnings = [...(job.warnings || []), "Translation failed; showing English."];
      }
      await job.save();
    }

    // 4. TTS (final text -> audio). Audio is optional — never let it fail the whole job.
    if (job.options.generateAudio && working && working.trim()) {
      try {
        job.audioFilename = await ai.tts(working, target || "en");
        await job.save();
      } catch (e) {
        job.warnings = [...(job.warnings || []), "Audio could not be generated."];
        await job.save();
      }
    }

    // 5. Comprehension check (A+C adaptive loop seed) — also non-fatal.
    try {
      job.comprehensionCheck = await ai.comprehensionCheck(
        job.simplifiedText || original,
        target || "en"
      );
    } catch (e) {
      job.warnings = [...(job.warnings || []), "Comprehension check unavailable."];
    }

    job.status = "done";
    await job.save();
  } catch (err) {
    job.status = "error";
    job.error = err.message;
    await job.save();
    console.error(`Job ${jobId} failed:`, err.message);
  }
}

exports.createTransform = async (req, res) => {
  try {
    const options = req.body.options
      ? JSON.parse(typeof req.body.options === "string" ? req.body.options : JSON.stringify(req.body.options))
      : {};
    const inputType = req.body.inputType || (req.file ? "image" : "text");

    const job = await Job.create({
      inputType,
      options: {
        simplify: options.simplify !== false,
        readingLevel: options.readingLevel || 2,
        targetLanguage: options.targetLanguage || cfg.DEFAULT_OUTPUT_LANGUAGE,
        generateAudio: options.generateAudio !== false,
      },
    });

    // Kick off processing in the background (don't await).
    runPipeline(job._id, {
      inputType,
      content: req.body.content,
      fileBuffer: req.file ? req.file.buffer : null,
      fileName: req.file ? req.file.originalname : null,
    });

    res.status(202).json({ jobId: job._id, status: "pending" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getJob = async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  const audioUrl = job.audioFilename
    ? `${cfg.NODE_BASE_URL}/api${cfg.AUDIO_PUBLIC_PATH}/${job.audioFilename}`
    : null;

  res.json({
    jobId: job._id,
    status: job.status,
    error: job.error || null,
    result: {
      originalText: job.originalText,
      simplifiedText: job.simplifiedText,
      translatedText: job.translatedText,
      audioUrl,
      comprehensionCheck: job.comprehensionCheck,
      // RULE 04 — explainability: source boxes, confidence, original-vs-simplified
      explainability: {
        blocks: job.blocks,
        meanConfidence: job.meanConfidence,
        lowConfidence: job.lowConfidence,
        warnings: job.warnings,
        comparison: {
          original: job.originalText,
          simplified: job.simplifiedText,
        },
      },
    },
  });
};
