// Asking the AI for a weekly plan. The Meal plan screen and the home screen both use this, so there is one way
// (and one daily limit, see weekStore.js) for the plan to be made.

import { getWeek } from "./api.js";
import { recentDishes, recordDishes } from "./planStore.js";
import { lastWeekFamilies, saveWeek, noteAsked, weekdayOf, dateOf, SLOTS } from "./weekStore.js";

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
