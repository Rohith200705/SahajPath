import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";

export default function Figure() {
  const { id } = useParams();
  const [file, setFile] = useState(null);
  const [lang, setLang] = useState("en");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!file) return alert("Choose an image.");
    setBusy(true); setRes(null);
    try { setRes(await api.describeFigure(file, lang)); } catch (e) { setRes({ error: e.message }); }
    setBusy(false);
  }

  return (
    <div className="page">
      <div className="tabs">
        <Link className="tab" to={`/lesson/${id}`}>Lesson</Link>
        <Link className="tab" to={`/lesson/${id}/chat`}>💬 Q&A</Link>
        <Link className="tab" to={`/lesson/${id}/mcq`}>✅ MCQ</Link>
        <Link className="tab active" to={`/lesson/${id}/figure`}>🖼️ Figure</Link>
      </div>
      <h1>Describe a figure</h1>
      <p className="muted">Upload a diagram/chart; get a spoken description for blind learners. (Needs Tesseract for text labels.)</p>
      <label>Image</label>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
      <label>Language</label>
      <select value={lang} onChange={(e) => setLang(e.target.value)}>
        <option value="en">English</option><option value="hi">Hindi</option><option value="ta">Tamil</option>
      </select>
      <button onClick={go} disabled={busy}>{busy ? "…" : "Describe"}</button>
      {res?.description && <div className="box" style={{ marginTop: 12 }}>{res.description}</div>}
      {res?.audioUrl && <audio controls src={res.audioUrl} />}
      {res?.error && <p>error: {res.error}</p>}
    </div>
  );
}
