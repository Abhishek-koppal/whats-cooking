"""The only place that talks to Gemini.

Every feature that needs the AI goes through generate_json(), so the model name,
timeout and error handling are changed in one spot.
"""

import json
import logging
import os

import httpx

log = logging.getLogger("whats-cooking.gemini")

# Google retires models fairly often. To switch without editing code, set GEMINI_MODEL
# in .env (on your computer) or in the Vercel dashboard (online).
DEFAULT_MODEL = "gemini-3.5-flash-lite"
TIMEOUT_SECONDS = 25


class GeminiError(Exception):
    """Something went wrong. `message` is safe to show to users, `status` is the HTTP status to return."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def model_name() -> str:
    return os.environ.get("GEMINI_MODEL") or DEFAULT_MODEL


async def _post(url: str, headers: dict, payload: dict) -> httpx.Response:
    # Kept as its own tiny function so the tests can swap it for a fake.
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
        return await client.post(url, headers=headers, json=payload)


async def generate_json(prompt: str, schema: dict, temperature: float = 0.7) -> dict:
    """Ask Gemini for an answer in the JSON shape described by `schema`."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name()}:generateContent"
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": os.environ["GEMINI_API_KEY"],  # sent in a header, never in the URL
    }
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": schema,
            "temperature": temperature,
        },
    }

    try:
        response = await _post(url, headers, payload)
    except httpx.TimeoutException:
        log.error("Gemini request timed out")
        raise GeminiError(504, "The recipe service took too long. Please try again.")
    except httpx.HTTPError as err:
        log.error("Gemini request failed: %s", type(err).__name__)
        raise GeminiError(502, "The recipe service had a problem. Please try again.")

    if response.status_code == 429:
        raise GeminiError(429, "Too many requests right now. Please wait a minute and try again.")
    if response.status_code != 200:
        # The real reason goes to the logs (visible to you); users only see a friendly message.
        log.error("Gemini error %s: %s", response.status_code, response.text[:500])
        raise GeminiError(502, "The recipe service had a problem. Please try again.")

    try:
        text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except (KeyError, IndexError, TypeError, ValueError):
        raise GeminiError(502, "Could not read the answer. Please try again.")
