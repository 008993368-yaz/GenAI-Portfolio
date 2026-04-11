"""Unit tests for deterministic IDs and RAG wrapper error handling."""

import pytest

from app.services import rag as rag_service
from scripts.ingest_resume import deterministic_id


def test_deterministic_id_is_stable_for_same_input():
    first = deterministic_id("same text", 0, "resume")
    second = deterministic_id("same text", 0, "resume")

    assert first == second
    assert len(first) == 16


def test_deterministic_id_changes_when_inputs_change():
    base = deterministic_id("same text", 0, "resume")
    changed_text = deterministic_id("different text", 0, "resume")
    changed_index = deterministic_id("same text", 1, "resume")
    changed_source = deterministic_id("same text", 0, "portfolio")

    assert base != changed_text
    assert base != changed_index
    assert base != changed_source


def test_generate_rag_response_raises_value_error_on_config_issue(monkeypatch):
    monkeypatch.setattr(rag_service, "get_rag_pipeline", lambda: (None, "OPENAI_API_KEY is required"))

    with pytest.raises(ValueError, match="OPENAI_API_KEY is required"):
        rag_service.generate_rag_response("hello")


def test_generate_rag_response_raises_on_missing_pipeline_without_error(monkeypatch):
    monkeypatch.setattr(rag_service, "get_rag_pipeline", lambda: (None, None))

    with pytest.raises(Exception, match="initialization failed"):
        rag_service.generate_rag_response("hello")


def test_generate_rag_response_success_path(monkeypatch):
    class DummyPipeline:
        def generate_response(self, query, conversation_history, top_k):
            return f"ok:{query}"

    monkeypatch.setattr(rag_service, "get_rag_pipeline", lambda: (DummyPipeline(), None))

    result = rag_service.generate_rag_response("hello")

    assert result == "ok:hello"


def test_generate_rag_response_bubbles_pipeline_exception(monkeypatch):
    class FailingPipeline:
        def generate_response(self, query, conversation_history, top_k):
            raise RuntimeError("LLM unavailable")

    monkeypatch.setattr(rag_service, "get_rag_pipeline", lambda: (FailingPipeline(), None))

    with pytest.raises(RuntimeError, match="LLM unavailable"):
        rag_service.generate_rag_response("hello")


def test_generate_suggested_questions_returns_fallback_on_pipeline_error(monkeypatch):
    monkeypatch.setattr(rag_service, "get_rag_pipeline", lambda: (None, "config error"))

    result = rag_service.generate_suggested_questions(last_user_message="hello")

    assert len(result) == 2
    assert "background" in result[0].lower() or "experience" in result[1].lower()
