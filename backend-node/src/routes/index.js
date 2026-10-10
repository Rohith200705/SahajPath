const express = require("express");
const multer = require("multer");
const cfg = require("../config");
const transform = require("../controllers/transformController");
const chat = require("../controllers/chatController");
const learn = require("../controllers/learnController");
const library = require("../controllers/libraryController");
const ai = require("../services/aiClient");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: cfg.MAX_UPLOAD_MB * 1024 * 1024 },
});

// Submit a lesson (text/webpage via JSON body, or image/pdf via multipart "file").
router.post("/transform", upload.single("file"), transform.createTransform);

// Preview + chunk long content before transforming (lets the user pick a chunk).
router.post("/preview", upload.single("file"), transform.preview);

// Poll a job's status + results.
router.get("/jobs/:jobId", transform.getJob);

// Lesson library + per-lesson conversation memory.
router.get("/lessons", library.listLessons);
router.get("/lessons/:jobId", transform.getJob);
router.get("/conversations/:jobId", library.getConversation);

// "Talk to your lesson" — grounded Q&A, optionally voiced back.
router.post("/chat", chat.ask);

// Adaptive (A+C) loop — submit a comprehension answer, get adapted level + re-explanation.
router.post("/comprehension/evaluate", learn.evaluate);

// Describe an uploaded diagram/figure for blind learners (+ spoken).
router.post("/describe-figure", upload.single("file"), learn.describeFigure);

// Supported languages for frontend dropdowns.
router.get("/languages", (req, res) => {
  const names = {
    en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu", kn: "Kannada",
    ml: "Malayalam", mr: "Marathi", bn: "Bengali", gu: "Gujarati",
    pa: "Punjabi", or: "Odia", as: "Assamese", ur: "Urdu",
  };
  res.json(cfg.SUPPORTED_LANGUAGES.map((c) => ({ code: c, name: names[c] || c })));
});

// Proxy generated audio from the Python service to the browser.
router.get("/media/audio/:filename", async (req, res) => {
  try {
    const upstream = await ai.fetchAudio(req.params.filename);
    res.setHeader("Content-Type", "audio/mpeg");
    upstream.data.pipe(res);
  } catch {
    res.status(404).json({ error: "Audio not found" });
  }
});

module.exports = router;
