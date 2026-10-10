"""Extraction: any input (text / image / pdf / webpage) -> clean text + STRUCTURE.

Returns not just text but per-block bounding boxes and OCR confidence, which
feed RULE 01 (structure) and RULE 04 (source boxes + confidence scores) and
RULE 06 (surfacing extraction uncertainty).

Heavy deps (PyMuPDF, Pillow, pytesseract, trafilatura) are imported lazily so the
service still boots (and text/webpage paths still work) if they aren't installed."""
import io
import requests

# Below this mean OCR confidence (0-100) we flag the extraction as uncertain.
LOW_CONFIDENCE_THRESHOLD = 60.0
# Cap extracted text so a huge page/PDF can't blow past LLM limits (RULE 06).
MAX_CHARS = 8000


def _result(text, blocks=None, confidence=None, source=None, warnings=None):
    """Uniform extraction envelope used by every path."""
    blocks = blocks or []
    warnings = warnings or []
    # Cap over-long text so downstream LLM calls stay within limits.
    if text and len(text) > MAX_CHARS:
        text = text[:MAX_CHARS].rsplit(" ", 1)[0]
        warnings = warnings + [f"Content was long; using the first {MAX_CHARS} characters."]
    return {
        "text": text,
        "blocks": blocks,              # [{text, bbox:[x,y,w,h], confidence, page}]
        "meanConfidence": confidence,  # 0-100, or None for digital text (exact)
        "source": source,             # text | image | pdf | webpage
        "lowConfidence": confidence is not None and confidence < LOW_CONFIDENCE_THRESHOLD,
        "warnings": warnings or [],
    }


def from_text(text: str) -> dict:
    t = text.strip()
    return _result(t, source="text")


def from_image(image_bytes: bytes) -> dict:
    """OCR an image, capturing per-word bounding boxes + confidence (RULE 01/04)."""
    from PIL import Image
    import pytesseract
    img = Image.open(io.BytesIO(image_bytes))
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    blocks, confs, words = [], [], []
    for i, word in enumerate(data["text"]):
        word = word.strip()
        conf = float(data["conf"][i]) if data["conf"][i] not in ("-1", -1) else -1
        if not word or conf < 0:
            continue
        words.append(word)
        confs.append(conf)
        blocks.append({
            "text": word,
            "bbox": [data["left"][i], data["top"][i], data["width"][i], data["height"][i]],
            "confidence": round(conf, 1),
            "page": 1,
        })
    text = " ".join(words).strip()
    mean_conf = round(sum(confs) / len(confs), 1) if confs else 0.0
    warnings = [] if text else ["No text detected in image."]
    return _result(text, blocks, mean_conf, "image", warnings)


def from_pdf(pdf_bytes: bytes) -> dict:
    """Digital PDFs: exact text + block bboxes (confidence=100). Scanned pages: OCR fallback."""
    import fitz  # PyMuPDF
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    all_text, blocks, ocr_confs, warnings = [], [], [], []
    for pno, page in enumerate(doc, start=1):
        page_dict = page.get_text("dict")
        page_text = page.get_text().strip()
        if page_text:  # digital text layer — exact, bbox from blocks
            for b in page_dict.get("blocks", []):
                btext = " ".join(
                    span["text"] for line in b.get("lines", []) for span in line.get("spans", [])
                ).strip()
                if not btext:
                    continue
                x0, y0, x1, y1 = b.get("bbox", [0, 0, 0, 0])
                blocks.append({
                    "text": btext,
                    "bbox": [round(x0), round(y0), round(x1 - x0), round(y1 - y0)],
                    "confidence": 100.0,
                    "page": pno,
                })
            all_text.append(page_text)
        else:  # scanned page -> rasterize + OCR
            from PIL import Image
            import pytesseract
            pix = page.get_pixmap(dpi=200)
            res = from_image(pix.tobytes("png"))
            for blk in res["blocks"]:
                blk["page"] = pno
                blocks.append(blk)
            if res["meanConfidence"] is not None:
                ocr_confs.append(res["meanConfidence"])
            all_text.append(res["text"])
            warnings.append(f"Page {pno} was scanned (OCR used).")
    doc.close()
    text = "\n\n".join(t for t in all_text if t).strip()
    mean_conf = round(sum(ocr_confs) / len(ocr_confs), 1) if ocr_confs else (100.0 if text else 0.0)
    return _result(text, blocks, mean_conf, "pdf", warnings)


def from_webpage(url: str) -> dict:
    """Scrape main readable content, stripping scripts/nav/styles."""
    text, warnings = "", []
    try:
        import trafilatura
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            text = (trafilatura.extract(downloaded) or "").strip()
    except Exception:
        pass
    if not text:
        # Fallback: fetch + BeautifulSoup, keep paragraph/heading text only.
        try:
            from bs4 import BeautifulSoup
            resp = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
                tag.decompose()
            parts = [p.get_text(" ", strip=True) for p in soup.find_all(["p", "h1", "h2", "h3", "li"])]
            text = "\n".join(p for p in parts if p).strip()
            if not text:
                text = soup.get_text(" ", strip=True)
        except Exception as e:
            warnings.append(f"Webpage extraction failed: {e}")
    if not text:
        warnings.append("No readable text found on the page.")
    return _result(text, source="webpage", warnings=warnings)
