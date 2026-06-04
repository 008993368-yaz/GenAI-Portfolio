"""Endpoint test for the streaming chat route."""

from fastapi.testclient import TestClient

from app import main


def test_chat_stream_returns_sse_events(monkeypatch):
    async def _fake_stream(session_id, message):
        yield {"type": "token", "text": "Hello"}
        yield {"type": "token", "text": " there"}
        yield {"type": "done"}

    monkeypatch.setattr(main, "stream_chat_reply", _fake_stream)

    client = TestClient(main.app)
    resp = client.post("/chat/stream", json={"sessionId": "s1", "message": "hi there"})

    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    body = resp.text
    assert 'data: {"type": "token", "text": "Hello"}' in body
    assert 'data: {"type": "token", "text": " there"}' in body
    assert 'data: {"type": "done"}' in body
