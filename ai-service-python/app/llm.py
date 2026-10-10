"""Groq LLM client (OpenAI-compatible). Used for simplify, translate, chat, figure-describe."""
from openai import OpenAI
from . import config

_client = OpenAI(api_key=config.GROQ_API_KEY, base_url=config.GROQ_BASE_URL)


def complete(system: str, user: str, temperature: float = 0.3, max_tokens: int = 4096) -> str:
    """Single-shot chat completion. Returns the assistant text.
    gpt-oss is a reasoning model and can occasionally return empty content when the
    token budget is tight; retry once with a larger budget before giving up."""
    def _call(mt):
        resp = _client.chat.completions.create(
            model=config.LLM_MODEL,
            temperature=temperature,
            max_tokens=mt,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return (resp.choices[0].message.content or "").strip()

    out = _call(max_tokens)
    if not out:
        out = _call(min(8192, max_tokens * 2))
    return out


def complete_vision(system: str, user_text: str, image_b64: str,
                    temperature: float = 0.3, max_tokens: int = 1500) -> str:
    """Multimodal completion: a prompt plus one base64-encoded image (data URL)."""
    resp = _client.chat.completions.create(
        model=config.VISION_MODEL,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": [
                {"type": "text", "text": user_text},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
            ]},
        ],
    )
    return (resp.choices[0].message.content or "").strip()
