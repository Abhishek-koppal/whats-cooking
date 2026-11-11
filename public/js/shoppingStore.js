// Remembers the shopping list on THIS phone: what to buy, what is ticked off, and the person's own extra items.
//
// The list belongs to one weekly plan (weekStore.js) in one language for one household size. When the plan is
// made again, the old list no longer fits and a new one is made. Asking the AI for a list is limited to
// MAX_LISTS_PER_DAY a day, counted before the request.

import { todayKey } from "./planStore.js";
import { daysBetween } from "./weekStore.js";

const SHOP_KEY = "wc.shop.v1";
export const MAX_LISTS_PER_DAY = 3; // the first list plus two "make the list again" taps
const MAX_CUSTOM = 40;

function read() {
  try {
    return JSON.parse(localStorage.getItem(SHOP_KEY)) ?? {};
  } catch {
    return {}; // storage blocked or corrupted: behave as if nothing was saved
  }
}

function write(value) {
  try {
    localStorage.setItem(SHOP_KEY, JSON.stringify(value));
  } catch {
    // Private browsing can block storage. The list still works, it just cannot be remembered.
  }
}

const sig = (prefs) => [prefs.state, prefs.region ?? "", prefs.diet, prefs.people, prefs.lang ?? "en"].join("|");

// Identifies the plan the list was made for: the same dishes on the same days.
export const planKey = (plan) => plan.start + "|" + plan.days.map((d) => ["breakfast", "lunch", "snacks", "dinner"].map((s) => d[s].name).join("/")).join(";");

export const itemId = (name) => name.trim().toLowerCase();

// The days still to come, in the shape the backend wants (the days already gone need no shopping).
export function daysToShopFor(plan, today = todayKey()) {
  const first = Math.max(0, daysBetween(plan.start, today));
  return plan.days.slice(first).map((d) => ({ breakfast: d.breakfast.name, lunch: d.lunch.name, snacks: d.snacks.name, dinner: d.dinner.name }));
}

const usableItem = (i) => i && typeof i.name === "string" && typeof i.quantity === "string" && typeof i.category === "string";

// The saved list for this plan, or null. { items, checked: {id: true}, custom: [{ id, name }] }
export function loadShopping(prefs, plan) {
  const saved = read();
  const list = saved.lists?.[sig(prefs)];
  if (!list || list.plan !== planKey(plan) || !Array.isArray(list.items) || !list.items.every(usableItem)) return null;
  return {
    items: list.items,
    checked: list.checked && typeof list.checked === "object" ? list.checked : {},
    custom: Array.isArray(list.custom) ? list.custom.filter((c) => c && typeof c.id === "string" && typeof c.name === "string") : [],
  };
}

export function listsLeft(today = todayKey()) {
  const saved = read();
  const used = saved.asked?.date === today && Number.isInteger(saved.asked.n) ? saved.asked.n : 0;
  return Math.max(0, MAX_LISTS_PER_DAY - used);
}

// Counts one request against today's limit. Called BEFORE asking, so a failing server cannot be hammered either.
export function noteListAsked(today = todayKey()) {
  const saved = read();
  const used = saved.asked?.date === today && Number.isInteger(saved.asked.n) ? saved.asked.n : 0;
  write({ ...saved, asked: { date: today, n: used + 1 } });
}

// Saves a freshly made list. Ticks and the person's own items from the previous list of this plan are kept.
export function saveShopping(prefs, plan, items) {
  const saved = read();
  const key = planKey(plan);
  const previous = saved.lists?.[sig(prefs)];
  const same = previous && previous.plan === key;
  const ids = new Set(items.map((i) => itemId(i.name)));
  const checked = same ? Object.fromEntries(Object.entries(previous.checked ?? {}).filter(([id]) => ids.has(id))) : {};
  // lists made for other plans are dropped: they could never be shown again
  const lists = Object.fromEntries(Object.entries(saved.lists ?? {}).filter(([, l]) => l.plan === key));
  lists[sig(prefs)] = { plan: key, items, checked, custom: same ? previous.custom ?? [] : [] };
  write({ ...saved, lists });
}

function update(prefs, plan, change) {
  const saved = read();
  const list = saved.lists?.[sig(prefs)];
  if (!list || list.plan !== planKey(plan)) return;
  change(list);
  write(saved);
}

export const setChecked = (prefs, plan, id, on) =>
  update(prefs, plan, (list) => {
    list.checked = list.checked ?? {};
    if (on) list.checked[id] = true;
    else delete list.checked[id];
  });

export const addCustomItem = (prefs, plan, name) =>
  update(prefs, plan, (list) => {
    list.custom = list.custom ?? [];
    const id = "mine:" + itemId(name);
    if (list.custom.length < MAX_CUSTOM && !list.custom.some((c) => c.id === id)) list.custom.push({ id, name });
  });

export const removeCustomItem = (prefs, plan, id) =>
  update(prefs, plan, (list) => {
    list.custom = (list.custom ?? []).filter((c) => c.id !== id);
    delete list.checked?.[id];
  });
