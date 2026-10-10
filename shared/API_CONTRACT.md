# API Contract — Accessible Learning Platform

> **For the frontend crew:** You only ever talk to the **Node backend** at `NODE_BASE_URL` (default `http://localhost:5000`). You never call the Python service directly. All endpoints below are prefixed with `/api`.

---

## Architecture at a glance

```
  ┌──────────────┐        HTTP (REST/JSON)        ┌─────────────────────┐
  │   FRONTEND   │  ───────────────────────────►  │   NODE / EXPRESS    │
  │  (React/etc) │  ◄───────────────────────────  │   (API Gateway)     │
  └──────────────┘                                 └──────────┬──────────┘
         ▲  frontend ONLY knows this URL                      │
         │                                        ┌───────────┼───────────┐
         │                                        ▼           ▼           ▼
         │                                   ┌─────────┐ ┌─────────┐ ┌──────────────┐
         │                                   │ MongoDB │ │ Storage │ │ PYTHON (AI)  │
         │                                   │  (jobs, │ │ (audio, │ │   FastAPI    │
         │                                   │  users) │ │ uploads)│ │ simplify/    │
         │                                   └─────────┘ └─────────┘ │ translate/   │
         │                                                           │ tts/ocr/chat │
         └── fetches audio from Node ──────────────────────────────►└──────────────┘
                                              (internal only, Node ↔ Python)
```

**Why two services?**
- **Node/Express** = the gateway the frontend loves: auth, MongoDB, file uploads, serving audio, CORS. JS-friendly for your crew.
- **Python/FastAPI** = the AI brain: OCR, simplification, translation, TTS, chat. Lives behind Node, never exposed to the browser.
- They talk over plain HTTP+JSON. Node forwards AI work to Python and stores results in MongoDB.

---

## Endpoints (Node — what the frontend calls)

### `POST /api/transform`
Submit content to transform. Returns a `jobId` immediately (processing is async).

**Body (JSON):**
```json
{
  "inputType": "text | image | pdf | webpage",
  "content": "raw text OR a URL (for webpage)",
  "options": {
    "simplify": true,
    "readingLevel": "simple",
    "targetLanguage": "ta",
    "generateAudio": true
  }
}
```
For `image`/`pdf`: send as `multipart/form-data` with a `file` field + a JSON `options` field.

**Response:** `{ "jobId": "abc123", "status": "pending" }`

### `GET /api/jobs/:jobId`
Poll for status + results.
```json
{
  "jobId": "abc123",
  "status": "pending | processing | done | error",
  "result": {
    "originalText": "...",
    "simplifiedText": "...",
    "translatedText": "...",
    "audioUrl": "http://localhost:5000/media/audio/abc123.mp3"
  }
}
```

### `POST /api/chat`
Ask a follow-up question grounded in a previously transformed content.
```json
{ "jobId": "abc123", "question": "explain step 2 again", "answerLanguage": "ta" }
```
**Response:** `{ "answer": "...", "audioUrl": "..." }`

### `GET /api/languages`
Returns supported languages for dropdowns: `[{ "code": "hi", "name": "Hindi" }, ...]`

### `POST /api/comprehension/evaluate`
Adaptive (A+C) loop. Submit the student's answer to a job's comprehension check.
```json
{ "jobId": "abc123", "studentAnswer": "a" }
```
**Response:** `{ "isCorrect": false, "newLevel": 1, "shouldReexplain": true, "reexplainedText": "...", "newCheck": "{...}" }`

### `POST /api/describe-figure`  (multipart)
Describe an uploaded diagram/figure for blind learners (+ spoken audio).
Fields: `file` (image), `lang`, optional `context`. **Response:** `{ "description": "...", "audioUrl": "..." }`

### Built-in test console
Open **`http://localhost:5000/`** in a browser — a one-page console that exercises every
endpoint above (transform, poll, chat with mic input, adaptive loop, figure description).
The Python AI service also has Swagger at **`http://localhost:8000/docs`**.

---

## Internal endpoints (Python — Node calls these, NOT the frontend)

| Endpoint | Purpose |
|---|---|
| `POST /ai/extract` | input (file/url) → clean text (OCR / PDF parse / scrape) |
| `POST /ai/simplify` | text → simplified text |
| `POST /ai/translate` | text + target lang → translated text |
| `POST /ai/tts` | text + lang → audio file path |
| `POST /ai/chat` | question + source text → grounded answer |

All protected by the `INTERNAL_API_SECRET` header so only Node can call them.

---

## Running it (dev)

```bash
# Terminal 1 — Python AI service
cd ai-service-python && uvicorn app.main:app --reload --port 8000

# Terminal 2 — Node backend
cd backend-node && npm run dev        # runs on :5000

# Terminal 3 — Frontend
cd frontend && npm start              # runs on :3000
```

Config for both services comes from one file: `shared/config.example.env` → copy to `.env`.
