// Thin client around the Python AI service. All AI work goes through here.
const axios = require("axios");
const FormData = require("form-data");
const cfg = require("../config");

const client = axios.create({
  baseURL: cfg.PYTHON_AI_URL,
  timeout: 120000, // AI calls can be slow
  headers: { "x-internal-secret": cfg.INTERNAL_API_SECRET },
});

async function extract({ inputType, content, fileBuffer, fileName }) {
  const form = new FormData();
  form.append("input_type", inputType);
  form.append("content", content || "");
  if (fileBuffer) form.append("file", fileBuffer, fileName || "upload");
  const { data } = await client.post("/ai/extract", form, {
    headers: { ...form.getHeaders(), "x-internal-secret": cfg.INTERNAL_API_SECRET },
  });
  return data; // { text, blocks, meanConfidence, lowConfidence, warnings, source }
}

const simplify = (text, level) =>
  client.post("/ai/simplify", { text, level }).then((r) => r.data.text);

const translate = (text, target_lang) =>
  client.post("/ai/translate", { text, target_lang }).then((r) => r.data.text);

const tts = (text, lang) =>
  client.post("/ai/tts", { text, lang }).then((r) => r.data.filename);

const chat = (question, source_text, answer_lang, history = []) =>
  client.post("/ai/chat", { question, source_text, answer_lang, history }).then((r) => r.data.answer);

const comprehensionCheck = (text, lang) =>
  client.post("/ai/comprehension-check", { text, lang }).then((r) => r.data.check);

const evaluateAnswer = (check_json, student_answer, current_level) =>
  client
    .post("/ai/evaluate-answer", { check_json, student_answer, current_level })
    .then((r) => r.data);

async function describeFigure({ fileBuffer, fileName, lang, context }) {
  const form = new FormData();
  form.append("file", fileBuffer, fileName || "figure.jpg");
  form.append("lang", lang || "en");
  form.append("context", context || "");
  const { data } = await client.post("/ai/describe-figure", form, {
    headers: { ...form.getHeaders(), "x-internal-secret": cfg.INTERNAL_API_SECRET },
  });
  return data.description;
}

const fetchAudio = (filename) =>
  client.get(`/ai/audio/${filename}`, { responseType: "stream" });

module.exports = {
  extract, simplify, translate, tts, chat,
  comprehensionCheck, evaluateAnswer, describeFigure, fetchAudio,
};
