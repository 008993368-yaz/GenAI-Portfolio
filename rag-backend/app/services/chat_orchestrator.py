"""
Chat Orchestrator Service
Keeps endpoint handlers thin by coordinating guardrails, memory, and RAG generation.
"""

import logging

from app.services.guardrails import get_off_topic_response, is_about_yazhini
from app.services.memory import get_memory
from app.services.rag import generate_rag_response, stream_rag_response

logger = logging.getLogger(__name__)


def generate_chat_reply(session_id: str, message: str) -> str:
    """Generate and persist a chat reply for a session."""
    memory = get_memory()

    if not is_about_yazhini(message):
        reply = get_off_topic_response()
        memory.add_message(session_id, "user", message)
        memory.add_message(session_id, "assistant", reply)
        return reply

    conversation_history = memory.get_history_for_llm(session_id)
    reply = generate_rag_response(query=message, conversation_history=conversation_history)

    memory.add_message(session_id, "user", message)
    memory.add_message(session_id, "assistant", reply)
    return reply


async def stream_chat_reply(session_id: str, message: str):
    """Stream a chat reply as a sequence of event envelopes.

    Yields ``{"type": "token", "text": ...}`` envelopes followed by exactly one
    ``{"type": "done"}`` on success, or a single ``{"type": "error", ...}`` if
    generation fails. The full reply is persisted to memory only on success.
    """
    memory = get_memory()

    if not is_about_yazhini(message):
        reply = get_off_topic_response()
        yield {"type": "token", "text": reply}
        memory.add_message(session_id, "user", message)
        memory.add_message(session_id, "assistant", reply)
        yield {"type": "done"}
        return

    conversation_history = memory.get_history_for_llm(session_id)
    parts = []
    try:
        async for token in stream_rag_response(
            query=message, conversation_history=conversation_history
        ):
            parts.append(token)
            yield {"type": "token", "text": token}
    except Exception:
        logger.exception("Streaming chat generation failed for session %s", session_id)
        yield {"type": "error", "message": "Failed to generate chat response."}
        return

    reply = "".join(parts)
    memory.add_message(session_id, "user", message)
    memory.add_message(session_id, "assistant", reply)
    yield {"type": "done"}
