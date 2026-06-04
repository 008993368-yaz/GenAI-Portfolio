"""Unit tests for the SSE envelope encoder."""

from app.services.sse import sse_encode


def test_sse_encode_token():
    assert sse_encode({"type": "token", "text": "hi"}) == (
        'data: {"type": "token", "text": "hi"}\n\n'
    )


def test_sse_encode_done():
    assert sse_encode({"type": "done"}) == 'data: {"type": "done"}\n\n'


def test_sse_encode_preserves_unicode():
    out = sse_encode({"type": "token", "text": "café"})
    assert "café" in out
    assert out.endswith("\n\n")
