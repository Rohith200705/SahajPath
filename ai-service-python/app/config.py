"""Central config — loads from shared/.env so Node and Python share one source."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load shared/.env (two levels up: ai-service-python/app/ -> project root -> shared)
_ENV_PATH = Path(__file__).resolve().parents[2] / "shared" / ".env"
load_dotenv(_ENV_PATH)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-oss-120b")
# Multimodal model for figure description (if the account exposes one).
# This Groq account has NO vision model, so vision.py falls back to OCR+LLM.
VISION_MODEL = os.getenv("VISION_MODEL", "")

TTS_PROVIDER = os.getenv("TTS_PROVIDER", "gtts")

PYTHON_AI_PORT = int(os.getenv("PYTHON_AI_PORT", "8000"))
INTERNAL_API_SECRET = os.getenv("INTERNAL_API_SECRET", "")

# Storage paths are resolved relative to the project root.
_ROOT = Path(__file__).resolve().parents[2]
AUDIO_OUTPUT_DIR = _ROOT / os.getenv("AUDIO_OUTPUT_DIR", "./storage/audio").lstrip("./")
UPLOAD_DIR = _ROOT / os.getenv("UPLOAD_DIR", "./storage/uploads").lstrip("./")
AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_LANGUAGES = os.getenv("SUPPORTED_LANGUAGES", "en,hi,ta").split(",")

# Human-readable names for prompts/UI.
LANGUAGE_NAMES = {
    "en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
    "kn": "Kannada", "ml": "Malayalam", "mr": "Marathi", "bn": "Bengali",
    "gu": "Gujarati", "pa": "Punjabi", "or": "Odia", "as": "Assamese",
    "ur": "Urdu",
}
