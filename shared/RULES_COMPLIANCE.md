# Rules & Constraints — Compliance Map

How each rule is satisfied, and what is backend vs. frontend work.

| Rule | Requirement | Status | Where / How |
|---|---|---|---|
| **01** | Extract text **+ structure** from PDFs, scans, images, diagrams, charts, flowcharts (OCR + multimodal) | ✅ backend (vision partial) | `extract.py`: digital PDF → exact text + block **bounding boxes**; scans/images → Tesseract OCR with per-word boxes; webpage scrape. Diagrams/charts → `describe-figure` (OCR+LLM fallback; true multimodal when a vision model is available). |
| **02** | Simplify to a reading level **preserving definitions, equations, relationships, meaning** | ✅ backend | `transform.simplify()` prompt explicitly keeps equations/numbers verbatim, keeps technical terms (+gloss), preserves cause-effect/part-whole relationships, adds plain restatements rather than replacing. 4 reading levels. |
| **03** | Audio + multiple languages **preserving technical terms + math** | ✅ backend | `translate()` keeps equations/symbols unchanged and term(English) on first use; `tts.synthesize()` → audio in the output language. |
| **04** | Explainable output: **source bounding boxes, confidence scores, original-vs-simplified** | ✅ backend | `/api/jobs/:id` → `result.explainability`: `blocks[]` (text+bbox+confidence+page), `meanConfidence`, `lowConfidence`, `warnings`, and `comparison { original, simplified }`. |
| **05** | **WCAG 2.2 AA**: screen reader, keyboard nav, high contrast, dyslexia-friendly | 🟡 frontend | Backend provides the hooks: audio for every output, structured text, word-level read-along (see note). Frontend must implement semantic HTML/ARIA, focus order, contrast themes, OpenDyslexic font, resizable text. |
| **06** | Low-bandwidth + graceful OCR/translation/multimodal **uncertainty** | ✅ backend | Text-only mode (`generateAudio:false`) avoids audio payloads; MP3 is compact; `lowConfidence`/`warnings` surface uncertainty per job; empty/garbled extraction fails clearly instead of feeding junk downstream; heavy deps are optional so core paths still serve. |

## Notes for the frontend crew (RULE 05 + read-along)

- **Read-along word highlighting:** gTTS does not emit word timings. Options: (a) use the browser `SpeechSynthesis` `onboundary` event for English/live highlighting, or (b) switch TTS to a service that returns word timestamps. The backend already returns the exact text to highlight.
- **WCAG AA** is a UI responsibility. Backend guarantees: every lesson has an audio alternative, text is returned as plain structured strings, and confidence/warnings are exposed so the UI can show "low-confidence — please verify."
- **Diagrams/charts** currently use OCR+LLM description because this Groq account has no vision model. Set `VISION_MODEL` in `.env` to a multimodal model to upgrade to true chart/flowchart understanding with no code change.

## What the API now returns (RULE 04 shape)

```jsonc
"result": {
  "originalText": "...",
  "simplifiedText": "...",
  "translatedText": "...",
  "audioUrl": "http://localhost:5000/api/media/audio/<id>.mp3",
  "explainability": {
    "blocks": [{ "text": "F = m*a", "bbox": [x,y,w,h], "confidence": 98.2, "page": 1 }],
    "meanConfidence": 94.1,
    "lowConfidence": false,
    "warnings": ["Page 2 was scanned (OCR used)."],
    "comparison": { "original": "...", "simplified": "..." }
  }
}
```
