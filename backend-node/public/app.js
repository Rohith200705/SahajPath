// SahajPath backend test console — pure vanilla JS, no build step.
const BASE = location.origin + "/api";
document.getElementById("base").textContent = location.origin;
const main = document.querySelector("main");
let lastJobId = null;

function card(title, innerHTML) {
  const el = document.createElement("section");
  el.className = "card";
  el.innerHTML = `<h2>${title}</h2>` + innerHTML;
  main.appendChild(el);
  return el;
}
function show(id, data) {
  document.getElementById(id).textContent =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
}
async function api(path, opts) {
  const res = await fetch(BASE + path, opts);
  const txt = await res.text();
  try { return { ok: res.ok, data: JSON.parse(txt) }; }
  catch { return { ok: res.ok, data: txt }; }
}

// ---- Health ----
(async () => {
  try {
    const r = await fetch(location.origin + "/health");
    const h = document.getElementById("health");
    if (r.ok) { h.textContent = "node ✓"; h.className = "pill ok"; }
    else throw 0;
  } catch { const h = document.getElementById("health"); h.textContent="node ✗"; h.className="pill bad"; }
})();

// ---- Languages ----
const langCard = card("1 · Languages", `
  <button id="btnLangs">GET /languages</button>
  <pre id="outLangs">—</pre>`);
let LANG_OPTS = '<option value="hi">Hindi</option><option value="ta">Tamil</option><option value="en">English</option><option value="te">Telugu</option><option value="bn">Bengali</option>';
document.getElementById("btnLangs").onclick = async () => {
  const { data } = await api("/languages");
  show("outLangs", data);
  if (Array.isArray(data)) LANG_OPTS = data.map(l => `<option value="${l.code}">${l.name}</option>`).join("");
  document.querySelectorAll("select.lang").forEach(s => { s.innerHTML = LANG_OPTS; });
};

// ---- Transform (text / pdf / image) ----
card("2 · Transform a lesson", `
  <label>Input type</label>
  <select id="tType"><option value="text">text</option><option value="image">image</option><option value="pdf">pdf</option><option value="webpage">webpage</option></select>
  <label>Text / URL (for text or webpage)</label>
  <textarea id="tContent">Photosynthesis is the process by which green plants use sunlight to synthesize food from carbon dioxide and water, releasing oxygen as a byproduct.</textarea>
  <label>File (for image / pdf)</label>
  <input type="file" id="tFile" />
  <div class="row">
    <div><label>Target language</label><select id="tLang" class="lang">${LANG_OPTS}</select></div>
    <div><label>Reading level (1–4)</label><input id="tLevel" type="number" min="1" max="4" value="2" /></div>
  </div>
  <div class="row">
    <label style="flex:0"><input type="checkbox" id="tSimplify" checked /> simplify</label>
    <label style="flex:0"><input type="checkbox" id="tAudio" checked /> audio</label>
  </div>
  <button id="btnTransform">POST /transform</button>
  <button class="alt" id="btnPoll">GET /jobs/:id (poll)</button>
  <pre id="outTransform">—</pre>
  <audio id="transformAudio" controls style="display:none"></audio>`);

document.getElementById("btnTransform").onclick = async () => {
  const type = document.getElementById("tType").value;
  const options = {
    simplify: document.getElementById("tSimplify").checked,
    readingLevel: parseInt(document.getElementById("tLevel").value, 10),
    targetLanguage: document.getElementById("tLang").value,
    generateAudio: document.getElementById("tAudio").checked,
  };
  const file = document.getElementById("tFile").files[0];
  let res;
  if (file) {
    const fd = new FormData();
    fd.append("inputType", type);
    fd.append("content", document.getElementById("tContent").value);
    fd.append("options", JSON.stringify(options));
    fd.append("file", file);
    res = await api("/transform", { method: "POST", body: fd });
  } else {
    res = await api("/transform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputType: type, content: document.getElementById("tContent").value, options }),
    });
  }
  show("outTransform", res.data);
  if (res.data.jobId) { lastJobId = res.data.jobId; document.getElementById("cJob").value = lastJobId; document.getElementById("fJob").value = lastJobId; }
};

document.getElementById("btnPoll").onclick = async () => {
  if (!lastJobId) return show("outTransform", "Run transform first.");
  const { data } = await api("/jobs/" + lastJobId);
  show("outTransform", data);
  const au = document.getElementById("transformAudio");
  if (data.result && data.result.audioUrl) { au.src = data.result.audioUrl; au.style.display = "block"; }
};

// ---- Talk to your lesson (chat, with optional voice input) ----
card("3 · Talk to your lesson (grounded chat)", `
  <label>Job ID</label><input id="cJob" placeholder="auto-filled from transform" />
  <label>Question</label>
  <div class="row"><textarea id="cQ">What gas do plants release?</textarea></div>
  <button class="alt" id="btnMic">🎙️ speak</button>
  <div class="row">
    <div><label>Answer language</label><select id="cLang" class="lang">${LANG_OPTS}</select></div>
    <label style="flex:0;align-self:end"><input type="checkbox" id="cSpeak" checked /> speak answer</label>
  </div>
  <button id="btnChat">POST /chat</button>
  <pre id="outChat">—</pre>
  <audio id="chatAudio" controls style="display:none"></audio>
  <p class="muted">Try an off-syllabus question (e.g. "who invented the car?") — it should refuse, not invent.</p>`);

document.getElementById("btnChat").onclick = async () => {
  const res = await api("/chat", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId: document.getElementById("cJob").value || lastJobId,
      question: document.getElementById("cQ").value,
      answerLanguage: document.getElementById("cLang").value,
      speak: document.getElementById("cSpeak").checked,
    }),
  });
  show("outChat", res.data);
  const au = document.getElementById("chatAudio");
  if (res.data.audioUrl) { au.src = res.data.audioUrl; au.style.display = "block"; au.play().catch(()=>{}); }
};

// Voice input via browser Web Speech API (the hero flow's STT, done client-side).
document.getElementById("btnMic").onclick = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return alert("SpeechRecognition not supported in this browser (use Chrome).");
  const rec = new SR();
  rec.lang = "en-IN";
  rec.onresult = (e) => { document.getElementById("cQ").value = e.results[0][0].transcript; };
  rec.start();
};

// ---- Adaptive comprehension loop (A+C) ----
card("4 · Adaptive comprehension (A+C loop)", `
  <p class="muted">The transform response includes a <code>comprehensionCheck</code>. Submit an answer; the level adapts (wrong → simpler + re-explain, right → harder).</p>
  <label>Job ID</label><input id="aJob" placeholder="auto-filled" />
  <label>Student answer (option key or text)</label><input id="aAns" value="a" />
  <button id="btnEval">POST /comprehension/evaluate</button>
  <pre id="outEval">—</pre>`);
document.getElementById("btnEval").onclick = async () => {
  const res = await api("/comprehension/evaluate", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId: document.getElementById("aJob").value || lastJobId, studentAnswer: document.getElementById("aAns").value }),
  });
  show("outEval", res.data);
};

// ---- Figure description (blind learners) ----
card("5 · Describe a figure (blind learners)", `
  <label>Image (diagram / chart / photo)</label><input type="file" id="fFile" accept="image/*" />
  <label>Job ID (optional — passes lesson context)</label><input id="fJob" placeholder="auto-filled" />
  <div class="row"><div><label>Language</label><select id="fLang" class="lang">${LANG_OPTS}</select></div></div>
  <button id="btnFig">POST /describe-figure</button>
  <pre id="outFig">—</pre>
  <audio id="figAudio" controls style="display:none"></audio>`);
document.getElementById("btnFig").onclick = async () => {
  const file = document.getElementById("fFile").files[0];
  if (!file) return show("outFig", "Choose an image first.");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("lang", document.getElementById("fLang").value);
  const res = await api("/describe-figure", { method: "POST", body: fd });
  show("outFig", res.data);
  const au = document.getElementById("figAudio");
  if (res.data.audioUrl) { au.src = res.data.audioUrl; au.style.display = "block"; }
};

// Populate language dropdowns on load.
document.getElementById("btnLangs").click();




