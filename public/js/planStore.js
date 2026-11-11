// Remembers today's recipes and the recent dishes on THIS phone.
// This is what keeps the app cheap: the recipes are asked from the AI once a day (when first opened), then reused.

const RECIPES_KEY = "wc.recipes.v1";
const HISTORY_KEY = "wc.history.v1";
const HISTORY_DAYS = 7; // today plus the 6 days before
const MAX_RECENT = 24; // how many recent dish names are sent along so the next weekly plan brings something new

// "2026-11-05" in the phone's own timezone (so the menu changes at the person's midnight).
export function todayKey(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Recipes are only reused while the answers, the language and the four dishes they were written for are unchanged.
// prefs may carry a `lang` field; without one it counts as English.
export function signature(prefs) {
  return [prefs.state, prefs.region ?? "", prefs.diet, prefs.people, prefs.lang ?? "en"].join("|");
}

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null; // storage blocked or corrupted: behave as if nothing was saved
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing can block storage. The app still works, it just asks the AI more often.
  }
}

const usable = (m) =>
  m && typeof m.slot === "string" && typeof m.name === "string" && Array.isArray(m.ingredients) && Array.isArray(m.steps);

// The dishes (from the weekly plan) that today's recipes are written for: "slot: name" lines, in order.
const dishKey = (meals) => meals.map((m) => `${m.slot}:${m.name}`).join("|");

// Today's saved recipes for these four dishes, or null. One set is kept for each language and household size.
export function loadRecipes(prefs, meals, today = todayKey()) {
  const saved = read(RECIPES_KEY);
  if (!saved || saved.date !== today || typeof saved.sets !== "object" || saved.sets === null) return null;
  const set = saved.sets[signature(prefs)];
  if (!set || set.dishes !== dishKey(meals) || !Array.isArray(set.meals) || set.meals.length !== 4 || !set.meals.every(usable)) return null;
  return set.meals;
}

export function saveRecipes(prefs, meals, recipes, today = todayKey()) {
  const saved = read(RECIPES_KEY);
  const sets = saved && saved.date === today && typeof saved.sets === "object" && saved.sets ? saved.sets : {};
  sets[signature(prefs)] = { dishes: dishKey(meals), meals: recipes };
  write(RECIPES_KEY, { date: today, sets });
}

// Remember the dish names, so tomorrow's menu (and a re-made menu today) can avoid them.
export function recordDishes(names, today = todayKey()) {
  const saved = read(HISTORY_KEY);
  const history = Array.isArray(saved) ? saved.filter((e) => e && typeof e.date === "string" && Array.isArray(e.names)) : [];

  let entry = history.find((e) => e.date === today);
  if (!entry) {
    entry = { date: today, names: [] };
    history.push(entry);
  }
  for (const name of names) if (!entry.names.includes(name)) entry.names.push(name);

  history.sort((a, b) => a.date.localeCompare(b.date));
  write(HISTORY_KEY, history.slice(-HISTORY_DAYS));
}

// Newest first, no duplicates, at most MAX_RECENT.
export function recentDishes() {
  const saved = read(HISTORY_KEY);
  if (!Array.isArray(saved)) return [];

  const names = [];
  for (const entry of [...saved].reverse()) {
    for (const name of [...(entry?.names ?? [])].reverse()) {
      if (typeof name === "string" && !names.includes(name)) names.push(name);
    }
  }
  return names.slice(0, MAX_RECENT);
}
