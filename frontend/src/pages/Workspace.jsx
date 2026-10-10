import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";

export default function Workspace() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.job(id).then(setData).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <div className="page"><p>error: {err}</p></div>;
  if (!data) return <div className="page"><p className="muted">loading…</p></div>;
  const r = data.result || {};
  const ex = r.explainability || {};

  const tabs = (
    <div className="tabs">
      <Link className="tab active" to={`/lesson/${id}`}>Lesson</Link>
      <Link className="tab" to={`/lesson/${id}/chat`}>💬 Q&A</Link>
      <Link className="tab" to={`/lesson/${id}/mcq`}>✅ MCQ</Link>
    </div>
  );

  if (data.status === "error") {
    return (
      <div className="page">
        {tabs}
        <div className="box" style={{ borderColor: "#dc2626" }}>
          <h4 style={{ color: "#f87171" }}>This lesson failed to transform</h4>
          {data.error || "Unknown error."}
          <p className="muted" style={{ marginTop: 10 }}>
            This often happens with very long pages or an unreachable URL. Try again, or use the
            chunk picker on the New lesson page to transform a smaller part.
          </p>
          <Link to="/new" className="cta" style={{ marginTop: 10 }}>Start a new lesson →</Link>
        </div>
      </div>
    );
  }
  if (data.status !== "done") {
    return <div className="page">{tabs}<p className="muted">⏳ Still processing… refresh in a few seconds.</p></div>;
  }

  return (
    <div className="page">
      {tabs}

      {ex.meanConfidence != null && (
        <span className={`flag ${ex.lowConfidence ? "low" : "good"}`}>
          OCR confidence: {ex.meanConfidence}{ex.lowConfidence ? " · low, verify" : ""}
        </span>
      )}
      {ex.warnings?.length > 0 && <p className="muted">⚠ {ex.warnings.join(" ")}</p>}

      <div className="cols">
        <div className="box"><h4>Original</h4>{r.originalText}</div>
        <div className="box"><h4>Simplified (English)</h4>{r.simplifiedText}</div>
      </div>
      {r.translatedText && (
        <div className="box" style={{ marginTop: 12 }}>
          <h4>Translated</h4>{r.translatedText}
        </div>
      )}
      {r.audioUrl && (
        <div style={{ marginTop: 12 }}>
          <h4>Listen</h4>
          <audio controls src={r.audioUrl} />
        </div>
      )}
    </div>
  );
}
