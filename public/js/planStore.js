// Remembers today's menu and the recent dishes on THIS phone.
// This is what keeps the app cheap: the menu is asked from the AI once a day, then reused.

const PLAN_KEY = "wc.plan.v1";
const HISTORY_KEY = "wc.history.v1";
const HISTORY_DAYS = 4; // today plus the 3 days before
const MAX_RECENT = 12; // how many recent dish names are sent along so the menu changes
export const MAX_CHANGES_PER_DAY = 2; // "Suggest a different menu" taps allowed per day

// "2026-11-05" in the phone's own timezone (so the menu changes at the person's midnight).
export function todayKey(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// A menu is only reused while the answers it was made for are unchanged.
export function signature(prefs) {
  return [prefs.state, prefs.region ?? "", prefs.diet, prefs.people].join("|");
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

// Today's saved menu, or null if there is none for today and these answers.
export function loadPlan(prefs, today = todayKey()) {
  const saved = read(PLAN_KEY);
  if (!saved || saved.date !== today || saved.sig !== signature(prefs)) return null;
  if (!Array.isArray(saved.meals) || saved.meals.length !== 3 || !saved.meals.every(usable)) return null;
  return { meals: saved.meals, changes: Number.isInteger(saved.changes) ? saved.changes : 0 };
}

export function savePlan(prefs, meals, changes, today = todayKey()) {
  write(PLAN_KEY, { date: today, sig: signature(prefs), meals, changes });
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
