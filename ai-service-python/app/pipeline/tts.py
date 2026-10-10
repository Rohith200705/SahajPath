"""Text-to-Speech using gTTS. Returns the saved MP3 filename."""
import uuid
from gtts import gTTS
from ..config import AUDIO_OUTPUT_DIR

# gTTS language codes line up with ours for the major Indian languages.
_GTTS_LANGS = {"en", "hi", "ta", "te", "kn", "ml", "mr", "bn", "gu", "pa", "ur"}


def synthesize(text: str, lang: str = "hi") -> str:
    """Generate speech, save as MP3 under AUDIO_OUTPUT_DIR, return the filename.
    Raises ValueError on empty text so callers can skip audio gracefully."""
    if not text or not text.strip():
        raise ValueError("No text to synthesize")
    tts_lang = lang if lang in _GTTS_LANGS else "en"
    filename = f"{uuid.uuid4().hex}.mp3"
    out_path = AUDIO_OUTPUT_DIR / filename
    gTTS(text=text.strip(), lang=tts_lang, slow=False).save(str(out_path))
    return filename
