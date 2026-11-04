"""Run the whole app on your own computer:  python dev.py   then open http://localhost:8000

LOCAL USE ONLY. On Vercel the website files are served by Vercel itself and this file is not used.
"""

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_env_file(path: Path) -> None:
    """Reads KEY=value lines from .env (the file with your secret key) into the environment."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


load_env_file(ROOT / ".env")

from fastapi.staticfiles import StaticFiles  # noqa: E402  (after the .env is loaded)

from app import app  # noqa: E402

# Serve the website from public/. The API routes above are matched first, so /api/... still works.
app.mount("/", StaticFiles(directory=ROOT / "public", html=True), name="public")

if __name__ == "__main__":
    import uvicorn

    if not os.environ.get("GEMINI_API_KEY"):
        print("\n  Note: GEMINI_API_KEY is not set. Copy .env.example to .env and paste your key.\n")
    uvicorn.run("dev:app", host="127.0.0.1", port=8000, reload=True, reload_dirs=[str(ROOT)])
