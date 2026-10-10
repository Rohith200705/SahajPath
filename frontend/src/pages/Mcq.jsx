import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";

export default function Mcq() {
  const { id } = useParams();
  const [check, setCheck] = useState(null);
  const [ans, setAns] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  function loadCheck(data) {
    try { setCheck(JSON.parse(data.result?.comprehensionCheck || "null")); } catch { setCheck(null); }
  }
  useEffect(() => { api.job(id).then(loadCheck).catch(() => {}); }, [id]);

  async function submit() {
    if (!ans) return alert("Select an answer.");
    setBusy(true); setRes(null);
    try {
      const r = await api.evaluate(id, ans);
      setRes(r);
      if (r.newCheck) { try { setCheck(JSON.parse(r.newCheck)); } catch {} setAns(""); }
    } catch (e) { setRes({ error: e.message }); }
    setBusy(false);
  }

  return (
    <div className="page">
      <div className="tabs">
        <Link className="tab" to={`/lesson/${id}`}>Lesson</Link>
        <Link className="tab" to={`/lesson/${id}/chat`}>💬 Q&A</Link>
        <Link className="tab active" to={`/lesson/${id}/mcq`}>✅ MCQ</Link>
      </div>
      <h1>Comprehension check</h1>
      <p className="muted">Answer adapts your reading level — wrong drops it and re-explains, right nudges up.</p>
      {check ? (
        <>
          <p className="question">{check.question}</p>
          {(check.options || []).map((o, i) => (
            <label key={i} className="opt">
              <input type="radio" name="opt" value={o} checked={ans === o} onChange={(e) => setAns(e.target.value)} /> {o}
            </label>
          ))}
          <button onClick={submit} disabled={busy}>{busy ? "…" : "Submit answer"}</button>
        </>
      ) : <p className="muted">No comprehension question for this lesson.</p>}
      {res && (
        <div className="box" style={{ marginTop: 12 }}>
          {res.error ? "error: " + res.error : (
            <>
              <b>{res.isCorrect ? "✅ Correct!" : "❌ Not quite."}</b> level {res.previousLevel} → {res.newLevel}
              {res.reexplainedText && <div style={{ marginTop: 8 }}><h4>Re-explained</h4>{res.reexplainedText}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
