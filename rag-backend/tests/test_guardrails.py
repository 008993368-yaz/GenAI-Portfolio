"""Unit tests for keyword guardrails logic."""

import pytest

from app.services.guardrails import get_off_topic_response, is_about_yazhini


@pytest.mark.parametrize(
    "message",
    [
        "Tell me about your work experience at Accenture",
        "What projects did you build with React?",
        "Can you share your education background?",
        "How many years of experience do you have?",
        "Do you know Python and Docker?",
    ],
)
def test_is_about_yazhini_on_topic(message):
    assert is_about_yazhini(message) is True


@pytest.mark.parametrize(
    "message",
    [
        "zebra mountain galaxy",
        "football match result yesterday",
        "pasta alfredo cooking instructions",
        "weather forecast tomorrow",
    ],
)
def test_is_about_yazhini_off_topic(message):
    assert is_about_yazhini(message) is False


@pytest.mark.parametrize("message", ["", "  ", "hi", "ok"])
def test_is_about_yazhini_empty_or_too_short(message):
    assert is_about_yazhini(message) is False


def test_is_about_yazhini_question_with_you_is_permissive():
    assert is_about_yazhini("Can you explain that?") is True


def test_get_off_topic_response_contains_redirect_guidance():
    response = get_off_topic_response()
    assert "outside my scope" in response.lower()
    assert "projects" in response.lower()
    assert "skills" in response.lower()
    assert "experience" in response.lower()
