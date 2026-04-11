"""
Chat Orchestrator Service
Keeps endpoint handlers thin by coordinating guardrails, memory, and RAG generation.
"""

from app.services.guardrails import get_off_topic_response, is_about_yazhini
from app.services.memory import get_memory
from app.services.rag import generate_rag_response


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
