"""Simplify, translate, figure-describe, and the comprehension (A+C) loop — all LLM-backed."""
from ..llm import complete
from ..config import LANGUAGE_NAMES

# Reading levels map to plain descriptions the model can target.
READING_LEVELS = {
    1: "a 2nd-grade child (age 7). Use the simplest possible words and very short sentences.",
    2: "a 5th-grade child (age 10). Use simple everyday words and short sentences.",
    3: "an 8th-grade student (age 13). Use clear language, define any hard terms.",
    4: "a high-school student. Keep it clear but you may use subject vocabulary.",
}


def simplify(text: str, level: int = 2) -> str:
    descriptor = READING_LEVELS.get(level, READING_LEVELS[2])
    system = (
        "You are an expert teacher who rewrites lessons so struggling readers understand. "
        "You NEVER add facts that are not in the source. You only re-explain what is given."
    )
    user = (
        f"Rewrite the following lesson so it is understandable by {descriptor}\n"
        "PRESERVE EXACTLY, do not drop or alter:\n"
        "- all definitions (you may add a plain-language restatement AFTER, not instead)\n"
        "- all equations, formulas and numbers (keep them verbatim)\n"
        "- cause-effect and part-whole relationships between ideas\n"
        "- technical/subject terms (keep the real term, add a simple gloss in brackets)\n"
        "Keep ALL key ideas. Do not invent new facts. Keep it in the same language as the input.\n\n"
        f"LESSON:\n{text}"
    )
    return complete(system, user, temperature=0.3)


def translate(text: str, target_lang: str) -> str:
    lang_name = LANGUAGE_NAMES.get(target_lang, target_lang)
    system = (
        f"You are a professional academic translator into {lang_name}. "
        f"Translate faithfully and naturally for a school student. "
        f"Keep equations, formulas, numbers and symbols UNCHANGED. "
        f"For technical/scientific terms, give the {lang_name} term with the English term in "
        f"brackets the first time, so the student still recognizes it. "
        f"Output only the translation."
    )
    return complete(system, f"Translate into {lang_name}:\n\n{text}", temperature=0.2)


def describe_figure(image_caption_or_context: str) -> str:
    """Describe a diagram/figure aloud for a blind learner, grounded in given context."""
    system = (
        "You help blind students. Describe the diagram clearly and concretely so a student "
        "who cannot see it understands what it shows. Use only the given context; invent nothing."
    )
    return complete(system, f"Describe this figure for a blind student:\n\n{image_caption_or_context}")


def make_comprehension_check(text: str, target_lang: str = "en") -> str:
    """Generate ONE comprehension question grounded in the lesson.

    IMPORTANT: we ALWAYS generate in English first (the model is accurate in English and
    stays grounded to the lesson), then translate the question + options into the target
    language. Generating regional languages directly caused ungrounded words (e.g. the model
    wrote "insects" instead of "plants" in Tamil). Translate-after keeps it faithful.

    Returns canonical JSON:
      {"question","options":[clean strings],"answerIndex":int,"answer":<option text>}
    """
    system = (
        "You create ONE simple multiple-choice comprehension question to check if a child "
        "understood a lesson. The question and ALL options MUST use only words and facts from "
        "the lesson — do not introduce any new subject, object, or term that is not in the lesson. "
        "Write in ENGLISH. Give 3 options. "
        'Respond ONLY as JSON: {"question": "...", "options": ["opt1","opt2","opt3"], "answerIndex": 0}. '
        'answerIndex is the 0-based index of the correct option. No letter prefixes like "a)".'
    )
    raw = complete(system, f"LESSON:\n{text}", temperature=0.3)
    canonical = _normalize_check(raw)

    if target_lang and target_lang != "en":
        canonical = _translate_check(canonical, target_lang)
    return canonical


def _translate_check(check_json: str, target_lang: str) -> str:
    """Translate a canonical check's question + options into target_lang, preserving
    answerIndex. Translating (not regenerating) keeps the question grounded to the lesson."""
    import json
    try:
        data = json.loads(check_json)
    except Exception:
        return check_json
    q = data.get("question", "")
    options = data.get("options", [])
    idx = data.get("answerIndex", 0)
    # One payload so order is preserved; translate() keeps terms/numbers intact.
    payload = json.dumps({"question": q, "options": options}, ensure_ascii=False)
    lang_name = LANGUAGE_NAMES.get(target_lang, target_lang)
    system = (
        f"Translate the JSON values into {lang_name}. Keep the SAME JSON structure and the "
        f"SAME number/order of options. Translate faithfully — do not change the meaning, do "
        f"not add or remove items. Keep formulas/numbers unchanged. Output ONLY the JSON."
    )
    out = complete(system, payload, temperature=0.1)
    try:
        s, e = out.find("{"), out.rfind("}")
        t = json.loads(out[s:e + 1])
        new_opts = [str(o) for o in t.get("options", options)]
        if len(new_opts) != len(options):
            new_opts = options  # fall back if the model dropped one
        idx = max(0, min(idx, len(new_opts) - 1)) if new_opts else 0
        return json.dumps(
            {"question": t.get("question", q), "options": new_opts,
             "answerIndex": idx, "answer": new_opts[idx] if new_opts else ""},
            ensure_ascii=False,
        )
    except Exception:
        return check_json  # keep English rather than break


def _normalize_check(raw: str) -> str:
    """Coerce whatever the model returned into a canonical, index-based check."""
    import json, re
    try:
        start, end = raw.find("{"), raw.rfind("}")
        data = json.loads(raw[start:end + 1])
    except Exception:
        # Could not parse — return a harmless empty check.
        return json.dumps({"question": raw.strip()[:200], "options": [], "answerIndex": 0, "answer": ""})

    options = [str(o) for o in data.get("options", [])]
    # Strip any leading "a) ", "b. ", "1) " style prefixes the model may have added.
    options = [re.sub(r"^\s*[a-dA-D0-9][\)\.\-]\s*", "", o).strip() for o in options]

    # Resolve the correct index from whatever the model gave us.
    idx = data.get("answerIndex")
    if not isinstance(idx, int) or idx < 0 or idx >= len(options):
        ans = str(data.get("answer", "")).strip()
        idx = 0
        if ans:
            low = ans.lower()
            if len(low) == 1 and low in "abcd":           # a letter -> index
                idx = "abcd".index(low)
            else:                                           # match by text
                for i, o in enumerate(options):
                    if o.lower() == low or low in o.lower() or o.lower() in low:
                        idx = i
                        break
    idx = max(0, min(idx, max(0, len(options) - 1)))
    answer = options[idx] if options else ""
    return json.dumps(
        {"question": data.get("question", ""), "options": options, "answerIndex": idx, "answer": answer},
        ensure_ascii=False,
    )


def evaluate_answer(check_json: str, student_answer: str, current_level: int) -> dict:
    """A+C adaptive loop: grade the student's answer against the canonical check,
    then adjust the reading level. Matches by option index OR text, so it is robust
    to the student sending either the option text or its position."""
    import json
    try:
        check = json.loads(check_json)
    except Exception:
        check = {}
    options = [str(o).strip().lower() for o in check.get("options", [])]
    answer_idx = check.get("answerIndex", -1)
    correct_text = str(check.get("answer", "")).strip().lower()

    given = (student_answer or "").strip().lower()
    is_correct = False
    if given:
        # 1) student sent a numeric index ("1")
        if given.isdigit() and int(given) == answer_idx:
            is_correct = True
        # 2) student sent the exact / contained option text
        elif correct_text and (given == correct_text or given in correct_text or correct_text in given):
            is_correct = True
        # 3) resolve the student's text to an option index and compare
        elif options:
            for i, o in enumerate(options):
                if o and (given == o or given in o or o in given):
                    is_correct = (i == answer_idx)
                    break

    new_level = min(4, current_level + 1) if is_correct else max(1, current_level - 1)
    return {
        "isCorrect": is_correct,
        "previousLevel": current_level,
        "newLevel": new_level,
        "shouldReexplain": not is_correct,
    }
