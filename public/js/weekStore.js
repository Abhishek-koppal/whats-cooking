// Remembers the weekly meal plan on THIS phone, so the AI is asked once for a whole week.
// The weekly plan is the ONE source of what is cooked: the home screen's "today" is a row of it.
//
// Quota protection: the plan is reused for all 7 days, and asking for a plan (the first one or a different one)
// is limited to MAX_WEEK_PLANS_PER_DAY a day in total, across languages.

import { todayKey } from "./planStore.js";

const WEEK_KEY = "wc.week.v1";
export const MAX_WEEK_PLANS_PER_DAY = 3; // the first plan plus two "different plan" taps
const TAIL_MEALS = 4; // the last day's four meals are sent along, so the next week does not start with the same dishes
const MAX_GAP_DAYS = 9; // a new plan only looks back at the old one if it follows it closely

function read() {
  try {
    return JSON.parse(localStorage.getItem(WEEK_KEY));
  } catch {
    return null; // storage blocked or corrupted: behave as if nothing was saved
  }
}

function write(value) {
  try {
    localStorage.setItem(WEEK_KEY, JSON.stringify(value));
  } catch {
    // Private browsing can block storage. The app still works, it just asks the AI more often.
  }
}

// The plan belongs to the answers (and language) it was made for. People are not part of it: names do not change.
export const weekSignature = (prefs) => [prefs.state, prefs.region ?? "", prefs.diet, prefs.lang ?? "en"].join("|");

// 0 = Monday ... 6 = Sunday (what the backend expects)
export const weekdayOf = (date = new Date()) => (date.getDay() + 6) % 7;

const parseKey = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// The calendar date `offset` days after the plan's first day.
export const dateOf = (startKey, offset) => parseKey(addDays(startKey, offset));

export function addDays(key, n) {
  const date = parseKey(key);
  date.setDate(date.getDate() + n);
  return todayKey(date);
}

// How many days `later` is after `earlier` (both "YYYY-MM-DD").
export const daysBetween = (earlier, later) => Math.round((parseKey(later) - parseKey(earlier)) / 86400000);

const usableMeal = (m) => m && typeof m.name === "string" && typeof m.family === "string";
export const SLOTS = ["breakfast", "lunch", "snacks", "dinner"];
const usableDays = (days) => Array.isArray(days) && days.length === 7 && days.every((d) => d && SLOTS.every((slot) => usableMeal(d[slot])));

// The plan to show today, or null if there is none (never made, ended, or made for other answers/language).
export function loadWeek(prefs, today = todayKey()) {
  const saved = read();
  if (!saved || typeof saved.start !== "string" || typeof saved.plans !== "object" || saved.plans === null) return null;
  const offset = daysBetween(saved.start, today);
  if (!(offset >= 0 && offset <= 6)) return null;
  const plan = saved.plans[weekSignature(prefs)];
  return plan && usableDays(plan.days) ? { start: saved.start, days: plan.days } : null;
}

// How many more plans may be asked for today.
export function plansLeft(today = todayKey()) {
  const saved = read();
  const used = saved?.asked?.date === today && Number.isInteger(saved.asked.n) ? saved.asked.n : 0;
  return Math.max(0, MAX_WEEK_PLANS_PER_DAY - used);
}

// The families of the last meals of the previous plan (oldest first), or the ones remembered for this
// same week when a plan is re-made. Sent to the backend so a new week does not start with last week's dishes.
export function lastWeekFamilies(prefs, startKey) {
  const saved = read();
  if (!saved || typeof saved.start !== "string") return [];
  if (saved.start === startKey) return Array.isArray(saved.tail) ? saved.tail : [];
  if (daysBetween(saved.start, startKey) > MAX_GAP_DAYS) return [];
  const plans = saved.plans && typeof saved.plans === "object" ? saved.plans : {};
  const days = (plans[weekSignature(prefs)] ?? Object.values(plans)[0])?.days;
  if (!usableDays(days)) return [];
  return days.flatMap((d) => SLOTS.map((slot) => d[slot].family)).slice(-TAIL_MEALS);
}

// Counts one request against today's limit. Called BEFORE asking, so a failing server cannot be hammered either.
export function noteAsked(today = todayKey()) {
  const saved = read() ?? {};
  const used = saved.asked?.date === today && Number.isInteger(saved.asked.n) ? saved.asked.n : 0;
  write({ ...saved, asked: { date: today, n: used + 1 } });
}

// Saves a freshly made plan.
export function saveWeek(prefs, days, startKey, tail) {
  const saved = read();
  const sameWeek = saved?.start === startKey && typeof saved.plans === "object" && saved.plans !== null;
  write({
    start: startKey,
    plans: { ...(sameWeek ? saved.plans : {}), [weekSignature(prefs)]: { days } },
    tail,
    asked: saved?.asked,
  });
}

// Today's four meals from the plan, as [{ slot, name, art, timeMinutes, ... }] in the order of the day.
// This is what the home screen shows, so it always agrees with the Meal plan screen.
export function todaysMeals(plan, today = todayKey()) {
  const day = plan.days[daysBetween(plan.start, today)];
  return day ? SLOTS.map((slot) => ({ ...day[slot], slot })) : null;
}
