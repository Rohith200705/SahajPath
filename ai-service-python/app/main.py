"""SahajPath AI service (FastAPI). INTERNAL — only the Node gateway calls this."""
from fastapi import FastAPI, Header, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel

from . import config
from .pipeline import extract, transform, tts, chat, vision

app = FastAPI(title="SahajPath AI Service")


def _check_secret(x_internal_secret: str | None):
    if config.INTERNAL_API_SECRET and x_internal_secret != config.INTERNAL_API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid internal secret")


# ---------- request models ----------
class TextIn(BaseModel):
    text: str

class SimplifyIn(BaseModel):
    text: str
    level: int = 2

class TranslateIn(BaseModel):
    text: str
    target_lang: str

class TTSIn(BaseModel):
    text: str
    lang: str = "hi"

class ChatIn(BaseModel):
    question: str
    source_text: str
    answer_lang: str = "en"
    history: list = []

class CheckIn(BaseModel):
    text: str
    lang: str = "en"

class EvaluateIn(BaseModel):
    check_json: str
    student_answer: str
    current_level: int = 2


@app.get("/health")
def health():
    return {"status": "ok", "model": config.LLM_MODEL}


@app.post("/ai/extract")
async def ai_extract(
    input_type: str = Form(...),
    content: str = Form(""),
    file: UploadFile | None = File(None),
    x_internal_secret: str | None = Header(None),
):
    _check_secret(x_internal_secret)
    try:
        if input_type == "text":
            res = extract.from_text(content)
        elif input_type == "image":
            res = extract.from_image(await file.read())
        elif input_type == "pdf":
            res = extract.from_pdf(await file.read())
        elif input_type == "webpage":
            res = extract.from_webpage(content)
        else:
            raise HTTPException(400, f"Unknown input_type: {input_type}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Extraction failed: {e}")
    return res


@app.post("/ai/simplify")
def ai_simplify(body: SimplifyIn, x_internal_secret: str | None = Header(None)):
    _check_secret(x_internal_secret)
    return {"text": transform.simplify(body.text, body.level)}


@app.post("/ai/translate")
def ai_translate(body: TranslateIn, x_internal_secret: str | None = Header(None)):
    _check_secret(x_internal_secret)
    return {"text": transform.translate(body.text, body.target_lang)}


@app.post("/ai/tts")
def ai_tts(body: TTSIn, x_internal_secret: str | None = Header(None)):
    _check_secret(x_internal_secret)
    return {"filename": tts.synthesize(body.text, body.lang)}


@app.post("/ai/chat")
def ai_chat(body: ChatIn, x_internal_secret: str | None = Header(None)):
    _check_secret(x_internal_secret)
    return {"answer": chat.answer(body.question, body.source_text, body.answer_lang, body.history)}


@app.post("/ai/comprehension-check")
def ai_check(body: CheckIn, x_internal_secret: str | None = Header(None)):
    _check_secret(x_internal_secret)
    return {"check": transform.make_comprehension_check(body.text, body.lang)}


@app.post("/ai/evaluate-answer")
def ai_evaluate(body: EvaluateIn, x_internal_secret: str | None = Header(None)):
    _check_secret(x_internal_secret)
    return transform.evaluate_answer(body.check_json, body.student_answer, body.current_level)


@app.post("/ai/describe-figure")
async def ai_describe_figure(
    file: UploadFile = File(...),
    lang: str = Form("en"),
    context: str = Form(""),
    x_internal_secret: str | None = Header(None),
):
    _check_secret(x_internal_secret)
    try:
        desc = vision.describe_figure(await file.read(), lang, context)
    except Exception as e:
        raise HTTPException(500, f"Figure description failed: {e}")
    return {"description": desc}


@app.get("/ai/audio/{filename}")
def ai_audio(filename: str):
    """Node fetches generated audio from here (internal)."""
    path = config.AUDIO_OUTPUT_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Audio not found")
    return FileResponse(str(path), media_type="audio/mpeg")
