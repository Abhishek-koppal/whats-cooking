"""The only place that talks to Gemini.

Every feature that needs the AI goes through generate_json(), so the model name,
timeout and error handling are changed in one spot.
"""

import asyncio
import json
import logging
import os
import time

import httpx

log = logging.getLogger("whats-cooking.gemini")

# Google retires models fairly often. To switch without editing code, set GEMINI_MODEL
# in .env (on your computer) or in the Vercel dashboard (online).
DEFAULT_MODEL = "gemini-3.5-flash-lite"
TIMEOUT_SECONDS = 28
# Hindi and Kannada take many more words (tokens) to write, so they get longer. Vercel allows one request
# 60 seconds in total (see vercel.json), so a retry only happens if there is time left inside this budget.
SLOW_TIMEOUT_SECONDS = 50
TOTAL_BUDGET_SECONDS = 55
MIN_TIME_FOR_RETRY = 8
MAX_OUTPUT_TOKENS = 14000
# Gemini sometimes says "busy" or hiccups for a moment (that is why a page can fail once and then work).
# Those cases are tried one more time before the user sees an error. Quota errors (429) are NOT retried.
RETRY_DELAY_SECONDS = 1.0
RETRY_STATUSES = {500, 502, 503, 504}


class GeminiError(Exception):
    """Something went wrong. `message` is safe to show to users, `status` is the HTTP status to return."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def model_name() -> str:
    return os.environ.get("GEMINI_MODEL") or DEFAULT_MODEL


async def _post(url: str, headers: dict, payload: dict, timeout: float = TIMEOUT_SECONDS) -> httpx.Response:
    # Kept as its own tiny function so the tests can swap it for a fake.
    async with httpx.AsyncClient(timeout=timeout) as client:
        return await client.post(url, headers=headers, json=payload)


def _final_error(kind: str) -> "GeminiError":
    if kind == "timeout":
        return GeminiError(504, "The recipe service took too long. Please try again.")
    return GeminiError(502, "The recipe service had a problem. Please try again.")


async def _send_with_one_retry(
    url: str, headers: dict, payload: dict, timeout: float, total_budget: float = TOTAL_BUDGET_SECONDS
) -> httpx.Response:
    """Sends the request. A timeout, a network hiccup or a Gemini 5xx is tried once more, if there is time left."""
    started = time.monotonic()
    for attempt in (1, 2):
        failure = None  # "timeout", "network" or "status" when this try did not work
        response = None
        try:
            response = await _post(url, headers, payload, max(1.0, min(timeout, total_budget - (time.monotonic() - started))))
        except httpx.TimeoutException:
            log.error("Gemini request timed out (attempt %s)", attempt)
            failure = "timeout"
        except httpx.HTTPError as err:
            log.error("Gemini request failed (attempt %s): %s", attempt, type(err).__name__)
            failure = "network"
        else:
            if response.status_code in RETRY_STATUSES:
                log.error("Gemini error %s (attempt %s): %s", response.status_code, attempt, response.text[:300])
                failure = "status"

        if failure is None:
            return response
        time_left = total_budget - (time.monotonic() - started) - RETRY_DELAY_SECONDS
        if attempt == 2 or time_left < MIN_TIME_FOR_RETRY:
            if failure == "status":
                return response  # let the caller turn it into the friendly error
            raise _final_error(failure)
        await asyncio.sleep(RETRY_DELAY_SECONDS)
    raise AssertionError("unreachable")


async def generate_json(
    prompt: str, schema: dict, temperature: float = 0.7, slow: bool = False, budget: float | None = None
) -> dict:
    """Ask Gemini for an answer in the JSON shape described by `schema`. slow=True gives it longer (for Hindi, Kannada).

    budget (seconds) caps the whole call, retry included, for callers that may make a second call inside Vercel's limit.
    """
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
            "maxOutputTokens": MAX_OUTPUT_TOKENS,
        },
    }

    total = TOTAL_BUDGET_SECONDS if budget is None else budget
    timeout = min(SLOW_TIMEOUT_SECONDS if slow else TIMEOUT_SECONDS, total)
    response = await _send_with_one_retry(url, headers, payload, timeout, total)

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
