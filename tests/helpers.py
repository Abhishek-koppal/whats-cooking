"""Small helpers shared by the test files."""

import json

import httpx

FAKE_RECIPE = {
    "recipeName": "Test Dish",
    "servings": 2,
    "timeMinutes": 15,
    "ingredients": [{"name": "rice", "quantity": "300 g"}],
    "steps": ["Cook."],
    "tip": "",
}


def gemini_ok(content=FAKE_RECIPE):
    """A fake successful Gemini answer. `content` is a dict (sent as JSON) or a raw string."""
    text = content if isinstance(content, str) else json.dumps(content)
    return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": text}]}}]})
