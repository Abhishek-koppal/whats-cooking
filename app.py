"""The backend entry point. Vercel looks for the variable called `app` in this file.

Layout:
  app.py             this file: creates the app and plugs in the features
  backend/           one module per feature, plus shared helpers (gemini.py, regions.py)
  public/            the website itself; Vercel serves it directly, so Python never touches it
"""

import os

from fastapi import FastAPI

from backend import gemini, regions
from backend.recipe import router as recipe_router

# The automatic /docs pages are switched off so the public link only exposes what the app needs.
app = FastAPI(title="What's Cooking?", docs_url=None, redoc_url=None, openapi_url=None)

app.include_router(recipe_router)
# Adding a feature = create backend/<feature>.py with a router, then add one line here.


@app.get("/api/health")
def health():
    """Open /api/health after deploying to check the setup. It never shows the key itself."""
    try:
        states = regions.state_count()
    except (OSError, ValueError, KeyError):
        states = None  # regions.json was not packaged with the function
    return {
        "ok": states is not None and bool(os.environ.get("GEMINI_API_KEY")),
        "regions_loaded": states is not None,
        "api_key_set": bool(os.environ.get("GEMINI_API_KEY")),
        "model": gemini.model_name(),
    }
