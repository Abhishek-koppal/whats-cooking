// Asking the AI for a weekly plan. The Meal plan screen and the home screen both use this, so there is one way
// (and one daily limit, see weekStore.js) for the plan to be made.

import { getWeek, getSwap } from "./api.js";
import { recentDishes, recordDishes } from "./planStore.js";
import { lastWeekFamilies, saveWeek, noteAsked, noteSwapAsked, replaceMeal, weekdayOf, dateOf, SLOTS } from "./weekStore.js";

// Makes a plan for the 7 days from startKey ("YYYY-MM-DD") and saves it for `lang`. Throws with a readable message.
export async function requestWeek({ prefs, lang, startKey }) {
  const planPrefs = { ...prefs, lang };
  const tail = lastWeekFamilies(planPrefs, startKey); // the old week's last day, so the new one does not start the same
  noteAsked();
  const data = await getWeek({
    state: prefs.state,
    region: prefs.region,
    diet: prefs.diet,
    start: weekdayOf(dateOf(startKey, 0)),
    avoid: recentDishes(),
    tail,
  });
  saveWeek(planPrefs, data.days, startKey, tail);
  recordDishes(data.days.flatMap((day) => SLOTS.map((slot) => day[slot].name)));
}

// Swaps ONE dish of the saved plan for another (a small request: the other 27 dishes stay). Returns
// { meal, previous } so the change can be undone; throws with a readable message.
export async function requestSwap({ prefs, lang, plan, index, slot }) {
  const planPrefs = { ...prefs, lang };
  const previous = plan.days[index][slot];
  noteSwapAsked();
  const data = await getSwap({
    state: prefs.state,
    region: prefs.region,
    diet: prefs.diet,
    start: weekdayOf(dateOf(plan.start, 0)),
    days: plan.days.map((day) => Object.fromEntries(SLOTS.map((s) => [s, { name: day[s].name, family: day[s].family, base: day[s].base, cuisine: day[s].cuisine }]))),
    day: index,
    slot,
    avoid: recentDishes(),
    tail: lastWeekFamilies(planPrefs, plan.start),
  });
  replaceMeal(planPrefs, index, slot, data.meal);
  recordDishes([data.meal.name]);
  return { meal: data.meal, previous };
}
