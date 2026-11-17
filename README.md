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

## My family
Nobody is added in advance. **My family** (the last tile) opens a list and an "Add a family member" form: who they are (myself, husband, wife, child, parent, other), an optional name, vegetarian or not, likes, favourite dishes, dislikes, allergies and intolerances, and two tick boxes for high blood pressure and diabetes.

- **Stays on the phone.** Profiles are saved only in the browser (`wc.family.v1`, `js/familyStore.js`). With each request the app sends food rules only (`forRequest`): a role such as "Child", likes, favourites, dislikes, allergies, and "low salt" / "low sugar". Names and the words blood pressure or diabetes are never sent.
- **Everything uses it.** `backend/family.py` turns the rules into prompt lines for the weekly plan, the day's recipes, "cook with what I have" and the shopping list: suit everyone, avoid dislikes, use favourites, low salt, low sugar, and mixed vegetarian households.
- **Allergies are enforced, not just asked for.** The weekly plan is checked for allergen words (and sweets when someone needs low sugar); recipes get one retry and are then refused (502) rather than shown with an allergen; allergen items are dropped from the shopping list.
- **Quota safe.** Editing the family costs nothing. A plan made before the family changed stays, with a banner offering a new plan (counted in the usual 3 a day). Saved recipes and the shopping list are keyed by a fingerprint of the family, so they are rewritten once when it changes.
- Tests: `tests/test_family.py`.

## Household size follows the family
Once family members are added, the number of people is the number of profiles (`livePrefs` in `public/js/main.js`). It sizes the day's recipes, the shopping list and the starting servings in "Cook with what I have". With no profiles, the number from the first questions is used. The family screen says which number is in use.

## Cook with what I have (proper dish and what to buy)
The AI is told to pick the real, classic dish your ingredients are the base of in the chosen cuisine (rice and egg in Chinese food is Egg Fried Rice, not rice with an egg mixed in), to use its genuine method, and to list every ingredient with `have` true or false. The server returns `missing` (the `have: false` ones). The screen shows "What you already have", then "What you still need to buy" with a **Copy shopping list** button (`js/clipboard.js`, shared with the Shopping screen). Tests: `tests/test_recipe.py`.

## Recipes ignore veg / non-veg; health needs still apply
"Cook with what I have" is not tied to the vegetarian or non-vegetarian choice (and the screen no longer shows it): the ingredients decide, so listed meat, fish or eggs are used and none are added as extras. Allergies, dislikes, low salt and low sugar from My family do apply to it, to the day's recipes, the weekly plan and the shopping list. Low salt means a pinch of salt and no soy sauce, ketchup, pickles or cheese; low sugar means no sugar, jaggery or sweet sauces. Each recipe carries a `familyNote` ("For your family: ...") saying how it was adjusted. Allergen checks skip that note.

## Swap one meal
Every dish on today and the days to come has a small swap button on the Meal plan screen (`POST /api/swap`, `backend/swap.py`). It is one small request instead of re-planning the week.
- The server works out which families, staples and cuisines are still allowed in that spot (not the same kind as the dish it replaces, not within a day of the same family, at most twice a week, one staple per meal in a day, veg and low-sugar rules, the cuisine mix, last week's final day) and gives the AI only those as the answer's allowed values. It then runs `check_plan` on the whole week and refuses a swap that causes any new problem, a dish already on the plan or cooked recently, and allergens. One retry, with the exact problems.
- The screen shows an **Undo** note (free: no request). Home follows at once because it reads the same plan.
- Quota: swaps are counted before asking, 10 a day (`MAX_SWAPS_PER_DAY` in `weekStore.js`), separate from the 3 weekly plans.
- If a dish is swapped after the shopping list was made, the list is kept with its ticks and marked "a dish was swapped", with an **Update the list** button (counted in the 3 lists a day). Today's recipes for a swapped day are written again when opened.
- Tests: `tests/test_swap.py`.

## Saved recipes
A heart button on every recipe (today's recipes and "Cook with what I have") keeps the whole recipe on the phone (`js/favStore.js`, `wc.fav.v1`, up to 60). Saved recipes open from the Home links and from the Cook screen, work offline, and cost no AI quota. Removing takes two taps.
