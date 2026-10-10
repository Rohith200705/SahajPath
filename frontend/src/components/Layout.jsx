import React, { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { api } from "../api.js";

// Shared chrome: left sidebar (library + new lesson) and the routed page on the right.
export default function Layout() {
  const [lessons, setLessons] = useState([]);
  const [health, setHealth] = useState("wait");
  const loc = useLocation();

  async function refresh() {
    try { setLessons(await api.lessons()); } catch { setLessons([]); }
  }
  useEffect(() => { refresh(); }, [loc.pathname]);
  useEffect(() => {
    api.health().then(() => setHealth("ok")).catch(() => setHealth("bad"));
  }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          SahajPath <span className={`badge ${health}`}>{health === "ok" ? "online" : health === "bad" ? "offline" : "…"}</span>
        </div>
        <Link to="/new" className="newbtn">+ New lesson</Link>
        <div className="libhdr">Library</div>
        <div className="lessons">
          {lessons.length === 0 && <p className="muted">No lessons yet.</p>}
          {lessons.map((l) => (
            <Link key={l.id} to={`/lesson/${l.id}`} className="lessonitem">
              <div className="lessontitle">{l.title || "Lesson"}</div>
              <div className="muted">{l.inputType} · {l.language}</div>
            </Link>
          ))}
        </div>
      </aside>
      <main className="content"><Outlet context={{ refresh }} /></main>
    </div>
  );
}
