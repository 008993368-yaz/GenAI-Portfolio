"""Unit tests for chat orchestration flow."""

from app.services import chat_orchestrator


class _FakeMemory:
    def __init__(self, history=None):
        self._history = history or []
        self.added = []

    def add_message(self, session_id, role, content):
        self.added.append((session_id, role, content))

    def get_history_for_llm(self, session_id):
        return self._history


def test_generate_chat_reply_off_topic_skips_rag(monkeypatch):
    fake_memory = _FakeMemory()

    monkeypatch.setattr(chat_orchestrator, "get_memory", lambda: fake_memory)
    monkeypatch.setattr(chat_orchestrator, "is_about_yazhini", lambda message: False)
    monkeypatch.setattr(chat_orchestrator, "get_off_topic_response", lambda: "Off-topic reply")

    rag_called = {"value": False}

    def _fake_rag(*args, **kwargs):
        rag_called["value"] = True
        return "Should not be used"

    monkeypatch.setattr(chat_orchestrator, "generate_rag_response", _fake_rag)

    reply = chat_orchestrator.generate_chat_reply("s1", "favorite movies?")

    assert reply == "Off-topic reply"
    assert rag_called["value"] is False
    assert fake_memory.added == [
        ("s1", "user", "favorite movies?"),
        ("s1", "assistant", "Off-topic reply"),
    ]


def test_generate_chat_reply_on_topic_uses_history_and_persists(monkeypatch):
    history = [{"role": "user", "content": "Tell me your background"}]
    fake_memory = _FakeMemory(history=history)

    monkeypatch.setattr(chat_orchestrator, "get_memory", lambda: fake_memory)
    monkeypatch.setattr(chat_orchestrator, "is_about_yazhini", lambda message: True)

    calls = {}

    def _fake_rag(query, conversation_history):
        calls["query"] = query
        calls["history"] = conversation_history
        return "I have 4+ years of experience."

    monkeypatch.setattr(chat_orchestrator, "generate_rag_response", _fake_rag)

    reply = chat_orchestrator.generate_chat_reply("s2", "Tell me about your experience")

    assert reply == "I have 4+ years of experience."
    assert calls["query"] == "Tell me about your experience"
    assert calls["history"] == history
    assert fake_memory.added == [
        ("s2", "user", "Tell me about your experience"),
        ("s2", "assistant", "I have 4+ years of experience."),
    ]
