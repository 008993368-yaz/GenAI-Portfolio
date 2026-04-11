"""Unit tests for session memory behavior."""

import time

from app.services.memory import SessionMemory


def test_add_and_get_history(session_memory, sample_session_id):
    session_memory.add_message(sample_session_id, "user", "Hello")
    session_memory.add_message(sample_session_id, "assistant", "Hi there")

    history = session_memory.get_history(sample_session_id)

    assert len(history) == 2
    assert history[0].content == "Hello"
    assert history[1].content == "Hi there"


def test_get_history_for_llm_format(session_memory, sample_session_id):
    session_memory.add_message(sample_session_id, "user", "Question")
    session_memory.add_message(sample_session_id, "assistant", "Answer")

    formatted = session_memory.get_history_for_llm(sample_session_id)

    assert formatted == [
        {"role": "user", "content": "Question"},
        {"role": "assistant", "content": "Answer"},
    ]


def test_clear_session_removes_messages(session_memory, sample_session_id):
    session_memory.add_message(sample_session_id, "user", "A")
    session_memory.add_message(sample_session_id, "assistant", "B")

    assert session_memory.get_message_count(sample_session_id) == 2

    session_memory.clear_session(sample_session_id)

    assert session_memory.get_message_count(sample_session_id) == 0
    assert session_memory.get_history(sample_session_id) == []


def test_unsupported_role_is_ignored(session_memory, sample_session_id):
    session_memory.add_message(sample_session_id, "system", "ignored")

    assert session_memory.get_message_count(sample_session_id) == 0


def test_cleanup_expired_sessions_removes_old_entries():
    memory = SessionMemory(
        max_messages_per_session=6,
        session_ttl_seconds=1,
        cleanup_interval_seconds=3600,
    )
    try:
        memory.add_message("expiring-session", "user", "Hello")
        assert memory.get_session_count() == 1

        time.sleep(1.1)
        removed = memory.cleanup_expired_sessions()

        assert removed == 1
        assert memory.get_session_count() == 0
    finally:
        memory._stop_event.set()  # pylint: disable=protected-access
        memory._cleanup_thread.join(timeout=1)  # pylint: disable=protected-access


def test_get_metrics_contains_expected_keys(session_memory, sample_session_id):
    session_memory.add_message(sample_session_id, "user", "hello")
    metrics = session_memory.get_metrics()

    assert "active_sessions" in metrics
    assert "cleanup_count" in metrics
    assert "cleanup_runs" in metrics
    assert "session_ttl_seconds" in metrics
    assert "cleanup_interval_seconds" in metrics
    assert metrics["active_sessions"] >= 1
