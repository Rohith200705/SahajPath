"""Figure/diagram description for blind learners.

NOTE: this Groq account exposes no multimodal (vision) model, so we use an
OCR + LLM fallback: read any text/labels in the figure, then have the LLM
describe it from those labels + lesson context. If a VISION_MODEL is configured
later, we use true image understanding instead.
"""
import base64
import io
from ..llm import complete, complete_vision
from ..config import LANGUAGE_NAMES, VISION_MODEL


def describe_figure(image_bytes: bytes, lang: str = "en", context: str = "") -> str:
    lang_name = LANGUAGE_NAMES.get(lang, "English")

    # Path A: true vision model, if the account has one.
    if VISION_MODEL:
        image_b64 = base64.b64encode(image_bytes).decode("ascii")
        system = (
            "You help blind students understand textbook figures. Describe ONLY what is "
            "visible — layout, labels, arrows, what it depicts. Invent nothing. "
            f"Respond in {lang_name}."
        )
        user_text = "Describe this textbook figure for a blind student."
        if context:
            user_text += f"\n\nLesson context (terminology only):\n{context}"
        return complete_vision(system, user_text, image_b64)

    # Path B (fallback): OCR the labels, then describe from them.
    try:
        from PIL import Image
        import pytesseract
        labels = pytesseract.image_to_string(Image.open(io.BytesIO(image_bytes))).strip()
    except Exception:
        labels = ""

    system = (
        "You help blind students understand a textbook figure. You are given the text "
        "labels detected in the figure (via OCR) and the surrounding lesson. Describe what "
        "the figure most likely shows and how its labels relate, so a student who cannot see "
        f"it understands. Be clear; do not fabricate specific visual details you cannot infer. "
        f"Respond in {lang_name}."
    )
    user = f"LABELS DETECTED IN FIGURE:\n{labels or '(none detected)'}\n\nLESSON CONTEXT:\n{context or '(none)'}"
    return complete(system, user)
