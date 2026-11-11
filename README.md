# Rasoi

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
  plan.py              recipes for a day (/api/plan); with `dishes` it writes recipes for the weekly plan's dishes
  shopping.py          the weekly shopping list (/api/shopping): the plan's dishes added up into one list
  week.py              the weekly meal plan (/api/week): breakfast, lunch, snacks and dinner for 7 days in ONE request, no repeats of similar dishes
  recipe.py            recipe from the ingredients you have (/api/recipe)
  common.py            shared checks and prompt rules (diet, home region)
  gemini.py            the only code that talks to Gemini
  regions.py           reads public/data/regions.json
public/                the website; Vercel serves it directly
  index.html, style.css, sw.js, manifest, icons
  data/regions.json    states, regions and diets (the ONE list, used by browser and server)
  js/                  main.js starts the app; features/ has one file per feature
    features/nav.js    the grid of feature buttons; connect a finished feature by changing its `view` there
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

## Layout, languages and text size

- **Any screen:** the layout adapts to the width of the page (CSS container queries). Phones get one column; laptops get a roomier two-column view for recipes. Text size is part of that, so large text never breaks the layout.
- **Logo:** tapping "Rasoi." always returns to the home screen.
- **Languages:** English, Hindi and Kannada, picked from the dropdown in the header. The choice is saved, and the AI writes the menu and recipes in that language. Each language gets its own menu per day (one AI call per language per day), then it is saved. Hindi/Kannada take a little longer. State names stay in English.
- **Text size:** the "Aa" button opens a slider (80% to 160%) with a Reset button.
- **Add a language:** add `public/js/i18n/<code>.js`, register it in `public/js/i18n.js`, add the file to `SHELL` in `public/sw.js` (and bump the cache number), and add the code to `LANGUAGES` in `backend/common.py`.

## Today's menu and your quota

The home screen shows breakfast, lunch and dinner for the day. To keep Gemini use low:

- **One request per person per day** plans the whole day (breakfast, lunch, snacks, dinner), with full recipes. It is saved on the phone, so opening the app again, or tapping "View today's recipes", costs nothing.
- A new request is made only when the day changes, when the answers (state, diet, people) change, or when "Suggest a different menu" is tapped (2 times a day on a phone).
- The last few days' dish names are sent along so the menu changes from day to day.
- Dish pictures are emoji tiles drawn by the phone, so no images are generated or downloaded.

The 2-a-day limit is kept on the phone, so it is a nudge, not real protection. The invite code and server-side limits (next steps below) are what protect your quota once the link is shared.

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

## Meal plan (weekly) and today's menu

- **One source of truth:** the weekly plan decides what is cooked. The home screen's "today" is today's row of the saved plan, so Home and the Meal plan screen always show the same dishes. There is no separate daily menu any more. If there is no plan when the app opens, one is made for the week (once per language and day).
- **One AI call per week:** the plan is 28 dish names (breakfast, lunch, snacks, dinner for 7 days; no recipes), saved on the phone for 7 days. Asking for a plan is limited to 3 a day in total (`weekStore.js`), counted before the request.
- **Recipes on demand:** "View today's recipes" (or tapping a meal) asks `/api/plan` with `dishes` set to today's four dishes, so it only writes recipes for exactly those dishes (the names are forced to match). Saved for the day, so it is one call a day at most.
- **One staple per meal:** every dish has a base (rice, roti, batter, pasta-noodles, bread, other). Breakfast, lunch and dinner of a day must each use a different one, so never rice three times in a day (`FAMILY_BASE` decides the clear cases, so the AI cannot mislabel a rice dish).
- **No similar meals close together:** every dish gets a "family" from a fixed list (`FAMILIES` in `backend/week.py`), so macaroni and spaghetti are both `pasta`. A family may not repeat on the same or the next day (whichever meal it is) and appears at most twice a week; the first day of a new week avoids the last day of the old one; breakfast-only and snack-only dishes stay in their slot; veg plans get no non-veg families; at least 6 of the 14 lunches and dinners are your home region's food.
- **Checked by the server:** if a rule is broken, Gemini is asked once more with the exact problems listed, and the better answer is used.
- **Tuning:** `MIN_DAY_GAP`, `MAX_PER_FAMILY`, `MIN_REGIONAL`, `MAX_PER_CUISINE`, `FAMILY_BASE` at the top of `backend/week.py`.

## Shopping list

- **Made from the weekly plan:** the dishes of the days still to come are sent to Gemini ONCE (`/api/shopping`), which adds the ingredients up into one list (the same ingredient from many dishes is one line with the total, sized for your household). It appears by itself the first time the Shopping screen is opened after a plan exists; opening it again costs nothing.
- **Saved on the phone** (`shoppingStore.js`): the list, what is ticked off and the person's own extra items survive reloads. If the plan is made again, the old list no longer fits and a new one is made (ticks that still match are kept). Asking for a list is limited to 3 a day, counted before the request.
- **Copy shopping list** copies what is still to buy (everything, if all is ticked), grouped like a shop.
- **Diet:** a vegetarian list never keeps meat, fish or eggs, whatever the AI wrote (`clean_items` in `backend/shopping.py`).
- **Icons:** the favicon and app icons come from the Rasoi chef-hat "R." logo (`favicon.ico`, `favicon-32.png`, `favicon-64.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`).
