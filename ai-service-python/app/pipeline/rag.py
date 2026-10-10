"""Lightweight RAG: pure-Python TF-IDF chunk retrieval (no embeddings, no deps).

The Groq account has no embedding model, so instead of semantic vectors we chunk the
lesson and score chunks against the question with TF-IDF cosine similarity. Good enough
to ground a single lesson's Q&A and keep the prompt small for long documents."""
import re
import math
from collections import Counter

_WORD = re.compile(r"[a-z0-9]+")


def _tokens(text: str):
    return _WORD.findall(text.lower())


def chunk(text: str, size: int = 500, overlap: int = 100):
    """Split text into overlapping character windows on word boundaries."""
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= size:
        return [text]
    chunks, start = [], 0
    while start < len(text):
        end = start + size
        piece = text[start:end]
        if end < len(text):  # avoid cutting mid-word
            piece = piece.rsplit(" ", 1)[0]
        chunks.append(piece.strip())
        start += max(1, len(piece) - overlap)
    return [c for c in chunks if c]


def retrieve(question: str, chunks, k: int = 4):
    """Return the top-k chunks most relevant to the question (TF-IDF cosine).
    Falls back to all chunks if there are k or fewer."""
    if not chunks:
        return []
    if len(chunks) <= k:
        return chunks

    docs = [_tokens(c) for c in chunks]
    N = len(docs)
    # Document frequency for IDF.
    df = Counter()
    for d in docs:
        for term in set(d):
            df[term] += 1
    idf = {t: math.log((N + 1) / (df[t] + 1)) + 1 for t in df}

    def vec(tokens):
        tf = Counter(tokens)
        return {t: (tf[t] / len(tokens)) * idf.get(t, 0.0) for t in tf} if tokens else {}

    def cosine(a, b):
        if not a or not b:
            return 0.0
        dot = sum(a[t] * b.get(t, 0.0) for t in a)
        na = math.sqrt(sum(v * v for v in a.values()))
        nb = math.sqrt(sum(v * v for v in b.values()))
        return dot / (na * nb) if na and nb else 0.0

    qv = vec(_tokens(question))
    scored = sorted(
        range(N), key=lambda i: cosine(qv, vec(docs[i])), reverse=True
    )
    top = sorted(scored[:k])  # keep original order for readability
    return [chunks[i] for i in top]
