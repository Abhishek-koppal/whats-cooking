# What's Cooking?

Enter the ingredients you have, pick the number of servings and a type of food, and get a recipe with quantities and steps. It asks where you are from (for Indian food) and whether you eat veg or non-veg. It is a web app that can be installed on a phone ("Add to Home Screen").

Backend: **Python (FastAPI)**. Frontend: plain HTML, CSS and JavaScript. Hosting: **Vercel** (free Hobby plan). AI: **Gemini** (free tier).

## How it fits together

```
Phone (public/)  ──►  /api/recipe (backend/recipe.py)  ──►  Gemini
   no secrets            holds the API key, checks the input      free tier
```

```
app.py                 creates the backend and plugs in the features
backend/
  recipe.py            the recipe feature (/api/recipe): checks input, builds the prompt
  gemini.py            the only code that talks to Gemini
  regions.py           reads public/data/regions.json
public/                the website; Vercel serves it directly
  index.html, style.css, sw.js, manifest, icons
  data/regions.json    states, regions and diets (the ONE list, used by browser and server)
  js/                  main.js starts the app; features/ has one file per feature
tests/                 pytest tests for the backend
dev.py                 runs everything on your computer (local use only)
```

Adding a feature = one file in `public/js/features/` for the screen, and one file in `backend/` (with a router) plus one `include_router` line in `app.py` if it needs the server. Every new frontend file must also be added to the list in `public/sw.js`, with the cache number bumped.

## Run it on your Mac

1. Get a free key at https://aistudio.google.com/apikey (no card needed).
2. In the VS Code terminal, in this folder:
   ```
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements-dev.txt
   cp .env.example .env
   ```
3. Open `.env` and replace `paste-your-key-here` with your key. No quotes, no spaces.
4. Start it:
   ```
   python dev.py
   ```
5. Open http://localhost:8000. Stop with Ctrl+C.

Next time you only need `source .venv/bin/activate` and `python dev.py`.

Run the tests with `pytest`. They use a fake Gemini, so they cost no quota.

## Put it online (free)

1. Put this folder on GitHub (a private repository is fine).
2. Go to vercel.com, sign up with GitHub, then Add New → Project and import the repository.
3. Vercel should detect FastAPI by itself. Leave the build settings alone.
4. Before deploying, open Environment Variables and add `GEMINI_API_KEY` with your key. Tick "Sensitive" if offered.
5. Deploy. Your link looks like `https://<project>.vercel.app`.
6. Open `https://<project>.vercel.app/api/health`. You should see `"ok": true`. If `regions_loaded` is false, tell me and I'll fix the packaging.

If opening the link in a private window asks you to log in to Vercel, turn off "Vercel Authentication" in the project's Settings → Deployment Protection.

## Limits and costs

- Vercel Hobby: free, 1,000,000 function calls a month. If you go over, the feature is paused for up to 30 days (you are not billed).
- **Vercel Hobby is for personal, non-commercial use only.** Family and friends is fine. If this becomes a paid service or a business tool, move to a paid plan or another host.
- Gemini free tier: limits are shown in your Google AI Studio account. Free-tier requests may be used by Google to improve its products, so keep personal information out of the app.
- Google retires models now and then. If recipes suddenly fail, set `GEMINI_MODEL` (in `.env` locally, or in Vercel's Environment Variables online) to a current model from https://ai.google.dev/gemini-api/docs/models.

## Not done yet (next steps)

- Invite code and per-user message limit (protects your free quota once you share the link).
- A hard daily cap on total requests.
- Saving favourite recipes.

Until the limits are added, keep the link private.
