# SahajPath — Backend

Adaptive accessibility layer: scan/upload/paste a lesson → **simplify → translate → read aloud → talk to it by voice**, grounded strictly to the lesson (no hallucination).

## Architecture

```
FRONTEND ──► NODE/EXPRESS (:5000, gateway) ──► PYTHON/FastAPI (:8000, AI brain)
                 │                                 └ extract/simplify/translate/tts/chat
                 ├─► MongoDB (jobs, lessons)
                 └─► serves audio to browser
```
Frontend only ever calls Node (`http://localhost:5000`). Python is internal, protected by a shared secret.

## Setup

**1. Config** — real secrets live in [shared/.env](shared/.env) (already filled, git-ignored). Template: [shared/config.example.env](shared/config.example.env).

**2. Python AI service**
```bash
cd ai-service-python
python -m venv .venv && source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
# OCR needs Tesseract installed on the OS: https://github.com/UB-Mannheim/tesseract
uvicorn app.main:app --reload --port 8000
```

**3. Node gateway**
```bash
cd backend-node
npm install
npm run dev    # http://localhost:5000
```

**4. React tester** (simple UI to exercise the backend)
```bash
cd frontend
npm install
npm run dev    # http://localhost:3000  (proxies /api to :5000)
```

## API (what the frontend uses)
See [shared/API_CONTRACT.md](shared/API_CONTRACT.md). Core endpoints:
- `POST /api/transform` → `{ jobId }`
- `GET  /api/jobs/:jobId` → status + results (text, translation, audioUrl, comprehension check)
- `POST /api/chat` → grounded answer (+ spoken audio) — the "talk to your lesson" hero feature
- `GET  /api/languages` → language list for dropdowns

## Notes
- **LLM provider is Groq** (your `gsk_` key is a Groq Cloud key, not xAI Grok). It's OpenAI-compatible; we use the `openai` SDK pointed at Groq. **Model: `openai/gpt-oss-120b`** — the account exposes `gpt-oss-120b/20b`, `qwen3.8-27b`, `whisper-large-v3` (STT), but **no vision model**, so figure description falls back to OCR + LLM.
- Translation reuses the LLM (no separate IndicTrans2 setup) to stay lean for the hackathon.
- TTS uses gTTS (free). Pipeline order is **simplify → translate → TTS** for best quality.
- **MongoDB:** in MongoDB Atlas → Network Access, allow your IP (or `0.0.0.0/0` for the hackathon). If the SRV connection fails on a restricted network, it's usually the IP allowlist or DNS.

## Verified
Core AI pipeline tested live against the real Groq key: simplify → translate (Hindi) → TTS (mp3) →
comprehension check → grounded chat (answers from the lesson; **refuses off-syllabus questions**) →
adaptive level loop. Node gateway boots and serves `/health`, `/api/languages`, and the test console.
Only MongoDB write was unverified here (network/allowlist in this environment) — works once your IP is allowlisted.

## Test it
Run both services, open `http://localhost:5000/` and use the console, or hit Swagger at `http://localhost:8000/docs`.
