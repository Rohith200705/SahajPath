"""Grounded chat: answer strictly from the lesson, using RAG retrieval + recent memory.

The anti-hallucination core: we retrieve only the most relevant passages of the lesson
and instruct the model to answer solely from them (plus the recent conversation for
follow-up context). If the answer is not present, it must say so rather than invent."""
from ..llm import complete
from ..config import LANGUAGE_NAMES
from . import rag


def answer(question: str, source_text: str, answer_lang: str = "en", history=None) -> str:
    lang_name = LANGUAGE_NAMES.get(answer_lang, "English")

    # RAG: pull the passages most relevant to this question.
    passages = rag.retrieve(question, rag.chunk(source_text), k=4)
    context = "\n\n".join(f"[Passage {i+1}] {p}" for i, p in enumerate(passages)) or source_text

    # Recent conversation memory (last few turns) for follow-up questions.
    convo = ""
    for turn in (history or [])[-6:]:
        role = "Student" if turn.get("role") == "user" else "Teacher"
        convo += f"{role}: {turn.get('text','')}\n"

    system = (
        "You are a patient teacher helping a student with THIS lesson.\n"
        "RULES:\n"
        "1. If the student greets you or makes small talk (e.g. 'hi', 'hello', 'thanks', "
        "'who are you'), reply warmly and briefly and invite them to ask about the lesson. "
        "Do NOT say the lesson doesn't cover it for greetings.\n"
        "2. For an actual QUESTION about the subject, answer ONLY using the passages below, "
        "with NO outside knowledge. If the answer is genuinely not in the passages, say (in the "
        "student's language) that this lesson does not cover it — do not make something up.\n"
        f"3. Always reply in {lang_name}, simply, as if to a young student."
    )
    user = (
        (f"CONVERSATION SO FAR:\n{convo}\n" if convo else "")
        + f"LESSON PASSAGES:\n{context}\n\nSTUDENT'S QUESTION:\n{question}"
    )
    return complete(system, user, temperature=0.2)
