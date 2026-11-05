"""Fixtures (ready-made test setups) shared by all test files."""

import pytest
from fastapi.testclient import TestClient

from app import app
from backend import gemini
from tests.helpers import gemini_ok


@pytest.fixture
def sent(monkeypatch):
    """Fake Gemini. `sent` records what the backend sent; set sent.reply to change the answer."""

    class Spy:
        calls: list = []
        reply = None  # a Response, or an Exception to raise

        @property
        def last(self):
            return self.calls[-1]

        @property
        def prompt(self):
            return self.last["payload"]["contents"][0]["parts"][0]["text"]

    spy = Spy()
    spy.calls = []
    spy.reply = gemini_ok()

    async def fake_post(url, headers, payload):
        spy.calls.append({"url": url, "headers": headers, "payload": payload})
        if isinstance(spy.reply, Exception):
            raise spy.reply
        return spy.reply

    monkeypatch.setattr(gemini, "_post", fake_post)
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    return spy


@pytest.fixture
def client():
    return TestClient(app)
