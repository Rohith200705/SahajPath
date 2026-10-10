import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, pollJob } from "../api.js";

const SAMPLE =
  "Photosynthesis is the process by which green plants use sunlight to synthesize food from carbon dioxide and water. The reaction is 6CO2 + 6H2O -> C6H12O6 + 6O2, releasing oxygen as a byproduct.";

export default function NewLesson() {
  const nav = useNavigate();
  const [langs, setLangs] = useState([{ code: "hi", name: "Hindi" }, { code: "ta", name: "Tamil" }, { code: "en", name: "English" }]);
  const [type, setType] = useState("text");
  const [content, setContent] = useState(SAMPLE);
  const [file, setFile] = useState(null);
  const [lang, setLang] = useState("en");
  const [level, setLevel] = useState(2);
  const [audio, setAudio] = useState(true);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [chunks, setChunks] = useState(null); // chunk picker state

  useEffect(() => { api.languages().then((l) => Array.isArray(l) && setLangs(l)).catch(() => {}); }, []);

  // Step 1: extract + check length. Short content transforms directly; long content
  // shows a chunk picker so the user transforms one manageable part at a time.
  async function prepare() {
    setBusy(true); setChunks(null); setStatus("reading content…");
    try {
      const p = await api.preview(type, content, file);
      if (p.error) { setStatus("error: " + p.error); setBusy(false); return; }
      if (p.needsChunking) {
        setChunks(p.chunks);
        setStatus(`Content is long (${p.totalChars} chars). Pick a part to transform.`);
      } else {
        await transformText(p.chunks.map((c) => c.text).join(" "));
      }
    } catch (e) { setStatus("error: " + e.message); }
    setBusy(false);
  }

  // Step 2: transform a specific piece of text as a lesson.
  async function transformText(text) {
    setBusy(true); setStatus("transforming… ~15-25s");
    const options = { simplify: true, readingLevel: Number(level), targetLanguage: lang, generateAudio: audio };
    try {
      const res = await api.transformText(text, options);
      if (!res.jobId) { setStatus("error: " + JSON.stringify(res)); setBusy(false); return; }
      await pollJob(res.jobId, (d) => setStatus(d.status), { timeout: 180000 });
      nav(`/lesson/${res.jobId}`);
    } catch (e) { setStatus("error: " + e.message); setBusy(false); }
  }

  return (
    <div className="page">
      <h1>New lesson</h1>
      <label>Input type</label>
      <select value={type} onChange={(e) => { setType(e.target.value); setChunks(null); }}>
        <option value="text">text</option>
        <option value="image">image (needs Tesseract)</option>
        <option value="pdf">pdf</option>
        <option value="webpage">webpage URL</option>
      </select>
      {type === "text" || type === "webpage" ? (
        <>
          <label>{type === "webpage" ? "URL" : "Lesson text"}</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} />
        </>
      ) : (
        <>
          <label>File ({type})</label>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        </>
      )}
      <div className="row">
        <div><label>Language</label>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            {langs.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </div>
        <div><label>Reading level (1–4)</label>
          <input type="number" min="1" max="4" value={level} onChange={(e) => setLevel(e.target.value)} /></div>
      </div>
      <label className="chk"><input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)} /> generate audio</label>
      <button onClick={prepare} disabled={busy}>{busy ? "working…" : "Transform"}</button>
      <p className="muted">status: {status || "—"}</p>

      {chunks && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ color: "#38bdf8" }}>Pick a part to transform ({chunks.length} parts)</h4>
          {chunks.map((c) => (
            <div key={c.index} className="box" style={{ marginBottom: 8 }}>
              <div className="muted">Part {c.index + 1} · {c.chars} chars</div>
              <div style={{ fontSize: 13, margin: "6px 0" }}>{c.preview}…</div>
              <button disabled={busy} onClick={() => transformText(c.text)}>Transform part {c.index + 1}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
