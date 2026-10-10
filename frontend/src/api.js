// Tiny API helper — all calls go through the Vite proxy to the Node gateway.
const BASE = "/api";

async function jsonFetch(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export const api = {
  health: () => fetch("/health").then((r) => r.json()),
  languages: () => fetch(BASE + "/languages").then((r) => r.json()),

  transformText: (content, options) =>
    jsonFetch("/transform", { inputType: "text", content, options }),
  transformWebpage: (content, options) =>
    jsonFetch("/transform", { inputType: "webpage", content, options }),
  preview: (inputType, content, file) => {
    if (file) {
      const fd = new FormData();
      fd.append("inputType", inputType);
      fd.append("file", file);
      return fetch(BASE + "/preview", { method: "POST", body: fd }).then((r) => r.json());
    }
    return jsonFetch("/preview", { inputType, content });
  },
  transformFile: (inputType, file, options) => {
    const fd = new FormData();
    fd.append("inputType", inputType);
    fd.append("options", JSON.stringify(options));
    fd.append("file", file);
    return fetch(BASE + "/transform", { method: "POST", body: fd }).then((r) => r.json());
  },

  job: (jobId) => fetch(BASE + "/jobs/" + jobId).then((r) => r.json()),
  lessons: () => fetch(BASE + "/lessons").then((r) => r.json()),
  conversation: (jobId) => fetch(BASE + "/conversations/" + jobId).then((r) => r.json()),
  chat: (payload) => jsonFetch("/chat", payload),
  evaluate: (jobId, studentAnswer) =>
    jsonFetch("/comprehension/evaluate", { jobId, studentAnswer }),
  describeFigure: (file, lang) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("lang", lang);
    return fetch(BASE + "/describe-figure", { method: "POST", body: fd }).then((r) => r.json());
  },
};

// Poll a job until it is done or errors (or times out).
export async function pollJob(jobId, onUpdate, { interval = 1500, timeout = 90000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const data = await api.job(jobId);
    onUpdate && onUpdate(data);
    if (data.status === "done" || data.status === "error") return data;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error("Polling timed out");
}
