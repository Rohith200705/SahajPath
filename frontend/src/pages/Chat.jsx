import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";

export default function Chat() {
  const { id } = useParams();
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState("");
  const [lang, setLang] = useState("en");
  const [speak, setSpeak] = useState(true);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    api.conversation(id).then((c) => setMsgs(c.messages || [])).catch(() => {});
  }, [id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  function mic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert("Use Chrome for voice input.");
    const r = new SR(); r.lang = "en-IN";
    r.onresult = (e) => setQ(e.results[0][0].transcript);
    r.start();
  }

  async function send() {
    if (!q.trim()) return;
    const question = q;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setQ(""); setBusy(true);
    try {
      const res = await api.chat({ jobId: id, question, answerLanguage: lang, speak });
      setMsgs((m) => [...m, { role: "assistant", text: res.answer, audioUrl: res.audioUrl }]);
      if (res.audioUrl && speak) new Audio(res.audioUrl).play().catch(() => {});
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", text: "error: " + e.message }]);
    }
    setBusy(false);
  }

  return (
    <div className="page chatpage">
      <div className="tabs">
        <Link className="tab" to={`/lesson/${id}`}>Lesson</Link>
        <Link className="tab active" to={`/lesson/${id}/chat`}>💬 Q&A</Link>
        <Link className="tab" to={`/lesson/${id}/mcq`}>✅ MCQ</Link>
        <Link className="tab" to={`/lesson/${id}/figure`}>🖼️ Figure</Link>
      </div>
      <div className="chatlog">
        {msgs.length === 0 && <p className="muted">Ask anything about this lesson. Answers come only from it.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.text}
            {m.audioUrl && <audio controls src={m.audioUrl} />}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="composer">
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="hi">Hindi</option><option value="ta">Tamil</option>
          <option value="te">Telugu</option><option value="en">English</option>
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask about the lesson…" />
        <button className="alt" onClick={mic} title="voice">🎙️</button>
        <label className="chk"><input type="checkbox" checked={speak} onChange={(e) => setSpeak(e.target.checked)} /> speak</label>
        <button onClick={send} disabled={busy}>{busy ? "…" : "Send"}</button>
      </div>
    </div>
  );
}
