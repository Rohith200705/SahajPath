import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="page">
      <h1>Make any lesson learnable 📖🔊</h1>
      <p className="muted">
        Scan, upload, or paste a lesson. SahajPath simplifies it, translates it to your
        language, reads it aloud, and lets you ask questions — grounded strictly to your lesson.
      </p>
      <Link to="/new" className="cta">Start a new lesson →</Link>
      <p className="muted" style={{ marginTop: 24 }}>
        Your past lessons are in the sidebar. Open one to read it, chat with it, take an MCQ, or
        describe its figures.
      </p>
    </div>
  );
}
