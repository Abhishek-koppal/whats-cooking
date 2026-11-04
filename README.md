# What's Cooking?

Enter the ingredients you have, pick the number of servings and a type of food, and get a recipe with quantities and steps. It is a web app that can be installed on a phone ("Add to Home Screen").

## How it fits together

```
Phone (public/)  ──►  /api/recipe (functions/api/recipe.js)  ──►  Gemini
   no secrets            holds the API key, checks the input         free tier
```

- `public/` is what the browser loads: the form, the styling, the install files and icons.
- `functions/api/recipe.js` is the backend. The Gemini key lives only here.

## Run it on your computer

1. Install Node.js (the LTS version) from nodejs.org.
2. Get a free key at https://aistudio.google.com/apikey (no card needed).
3. In this folder, copy `.dev.vars.example` to `.dev.vars` and paste your key.
4. Run:
   ```
   npm install
   npm run dev
   ```
5. Open the address it prints (usually http://localhost:8788).

## Put it online (free)

1. Push this folder to a GitHub repository.
2. In the Cloudflare dashboard: Workers & Pages → Create → Pages → connect the repo.
3. Build command: leave empty. Build output directory: `public`.
4. After the first deploy: Settings → Variables and Secrets → add `GEMINI_API_KEY` as a **secret**.
5. Redeploy once so the secret is picked up. Your link looks like `https://<project>.pages.dev`.

## Project layout

```
functions/
  api/recipe.js            backend endpoint for recipes (one file per endpoint)
  shared/                  helpers every endpoint uses (Gemini call, JSON replies)
public/
  index.html, style.css    the page and its look
  sw.js, manifest, icons   make it installable
  js/
    main.js                starts the app, connects the features
    api.js, ui.js, prefs.js  shared helpers
    data/regions.js        states, regions and diets (used by browser AND server)
    features/onboarding.js first-visit questions
    features/recipe.js     recipe form and result
```

Adding a feature = one new file in `public/js/features/` (plus one in `functions/api/` if it needs the server).
Every new frontend file must also be added to the list in `public/sw.js`, with the cache number bumped.

## Not done yet (next steps)

- Invite code and per-user message limit (protects your free quota once you share the link).
- A hard daily cap on total requests.
- Saving favourite recipes.

Until the limits are added, keep the link private.
