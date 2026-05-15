"""Vercel deployment entrypoint tests."""

from fastapi import FastAPI


def test_vercel_entrypoint_exports_backend_app():
    """The Vercel function entrypoint should expose the existing FastAPI app."""
    from api.index import app

    assert isinstance(app, FastAPI)
    assert any(route.path == "/chat" for route in app.routes)
