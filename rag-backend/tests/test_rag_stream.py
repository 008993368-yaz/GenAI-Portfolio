"""Unit tests for RAG streaming helpers."""

from app.services.rag import _extract_answer_token


def test_extract_answer_token_returns_answer_text():
    assert _extract_answer_token({"answer": "Hello"}) == "Hello"


def test_extract_answer_token_skips_context_only_chunk():
    assert _extract_answer_token({"context": ["doc"]}) is None


def test_extract_answer_token_skips_empty_answer():
    assert _extract_answer_token({"answer": ""}) is None


def test_extract_answer_token_skips_non_dict():
    assert _extract_answer_token("nope") is None
