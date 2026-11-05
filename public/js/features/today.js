// Feature: the "Today's menu" home screen and the recipes view.
//
// Cost control: the menu is asked from the AI ONCE per day (all three meals with full recipes in
// one request) and saved on the phone. Opening the app again, or tapping "View today's recipes",
// shows the saved copy and uses no AI quota. Only "Suggest a different menu" asks again, and
// that is limited to a couple of times a day.

import { getPlan } from "../api.js";
import { el } from "../ui.js";
import { SLOT_LABEL, dishTile } from "../dishArt.js";
import { loadPlan, savePlan, recentDishes, recordDishes, MAX_CHANGES_PER_DAY } from "../planStore.js";

export function greetingFor(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return { text: "Good morning!", icon: "☀️" };
  if (hour < 17) return { text: "Good afternoon!", icon: "🌤️" };
  return { text: "Good evening!", icon: "🌙" };
}

// Which meal is coming up, by the time of day.
export function nextSlotFor(now = new Date()) {
  const hour = now.getHours();
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  return "dinner";
}

const metaOf = (meal) => [meal.timeMinutes ? `${meal.timeMinutes} min` : "", meal.difficulty].filter(Boolean).join(" · ");

const textButton = (text, onClick) =>
  el("button", { className: "link", text, attrs: { type: "button" }, on: { click: onClick } });

// homeEl / recipesEl are the two screens; go(view, arg) is main.js's way of switching screens.
export function initToday({ homeEl, recipesEl, getPrefs, go }) {
  let meals = null;
  let changes = 0;
  let busy = false;

  function renderLoading(text) {
    homeEl.replaceChildren(
      el(
        "div",
        { className: "loading" },
        el("div", { className: "chef", text: "🧑‍🍳", attrs: { "aria-hidden": "true" } }),
        el("p", { className: "lead", text, attrs: { role: "status" } })
      )
    );
  }

  function renderError(message) {
    homeEl.replaceChildren(
      el("h2", { text: "Couldn't plan today's menu" }),
      el("p", { className: "error", text: message, attrs: { role: "alert" } }),
      el("button", { className: "primary", text: "Try again", attrs: { type: "button" }, on: { click: () => generate(0) } }),
      el("div", { className: "home-links" }, textButton("Cook with what I have", () => go("cook")))
    );
  }

  function renderHome(notice = "") {
    const now = new Date();
    const prefs = getPrefs();
    const greet = greetingFor(now);
    const family = prefs.people > 1;
    const upNext = nextSlotFor(now);
    const left = MAX_CHANGES_PER_DAY - changes;

    const list = el(
      "ul",
      { className: "meals" },
      ...meals.map((meal) =>
        el(
          "li",
          {},
          el(
            "button",
            { className: "meal", attrs: { type: "button" }, on: { click: () => go("recipes", meal.slot) } },
            dishTile(meal),
            el(
              "span",
              { className: "meal-body" },
              el(
                "span",
                { className: "meal-head" },
                el("span", { className: "meal-slot", text: SLOT_LABEL[meal.slot] }),
                meal.slot === upNext ? el("span", { className: "tag", text: "Up next" }) : ""
              ),
              el("span", { className: "meal-name", text: meal.name }),
              el("span", { className: "meal-meta", text: metaOf(meal) })
            )
          )
        )
      )
    );

    homeEl.replaceChildren(
      el(
        "div",
        { className: "today-head" },
        el(
          "div",
          {},
          el("h2", { text: `${greet.text} ${greet.icon}` }),
          el("p", { className: "meta", text: `${now.toLocaleDateString(undefined, { weekday: "long" })} · Let's make something delicious` })
        ),
        el("span", { className: "chef", text: "🧑‍🍳", attrs: { "aria-hidden": "true" } })
      ),
      el(
        "div",
        { className: "plan-box" },
        el("p", { className: "eyebrow", text: "TODAY'S COOKING PLAN" }),
        el("h3", { text: family ? "Your family menu is ready!" : "Your menu is ready!" }),
        el("p", { text: `We've planned three meals based on your ${family ? "family's " : ""}preferences.` })
      ),
      el("h3", { className: "section-title", text: "Today's meals" }),
      list,
      el("button", { className: "primary dark", text: "View today's recipes →", attrs: { type: "button" }, on: { click: () => go("recipes") } }),
      notice ? el("p", { className: "error", text: notice, attrs: { role: "alert" } }) : "",
      el(
        "div",
        { className: "home-links" },
        left > 0
          ? textButton(`Suggest a different menu (${left} left today)`, () => generate(changes + 1))
          : el("span", { className: "home-note", text: "That's all the menu changes for today." }),
        textButton("Cook with what I have", () => go("cook"))
      )
    );
  }

  function renderRecipes(openSlot) {
    if (!meals) return go("home");
    const opened = openSlot ?? nextSlotFor();

    const cards = meals.map((meal) =>
      el(
        "details",
        { className: "recipe", attrs: meal.slot === opened ? { open: "" } : {} },
        el(
          "summary",
          {},
          dishTile(meal),
          el(
            "span",
            { className: "meal-body" },
            el("span", { className: "meal-slot", text: SLOT_LABEL[meal.slot] }),
            el("span", { className: "meal-name", text: meal.name }),
            el("span", { className: "meal-meta", text: metaOf(meal) })
          )
        ),
        el(
          "div",
          { className: "recipe-body" },
          el("h4", { text: "What you need" }),
          el("ul", {}, ...meal.ingredients.map((i) => el("li", { text: [i.quantity, i.name].filter(Boolean).join(" ") }))),
          el("h4", { text: "How to make it" }),
          el("ol", {}, ...meal.steps.map((step) => el("li", { text: step }))),
          meal.tip ? el("p", { className: "tip", text: `Tip: ${meal.tip}` }) : ""
        )
      )
    );

    recipesEl.replaceChildren(
      el("button", { className: "link back", text: "← Today's menu", attrs: { type: "button" }, on: { click: () => go("home") } }),
      el("h2", { text: "Today's recipes" }),
      ...cards
    );
    recipesEl.querySelector("details[open]")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  // Asks the AI for a menu. newChanges is 0 for the day's first menu, then 1, 2 for re-makes.
  async function generate(newChanges) {
    if (busy) return;
    busy = true;
    const hadMenu = meals !== null && newChanges > 0;
    renderLoading(hadMenu ? "Finding a different menu…" : "Planning today's menu…");

    const prefs = getPrefs();
    try {
      const data = await getPlan({
        state: prefs.state,
        region: prefs.region,
        diet: prefs.diet,
        people: prefs.people,
        avoid: recentDishes(), // yesterday's dishes (and today's, when re-making), so it changes
      });
      meals = data.meals;
      changes = newChanges;
      savePlan(prefs, meals, changes);
      recordDishes(meals.map((m) => m.name));
      renderHome();
    } catch (err) {
      if (hadMenu) renderHome(err.message); // keep showing the menu we already had
      else renderError(err.message);
    } finally {
      busy = false;
    }
  }

  async function showHome() {
    const saved = loadPlan(getPrefs());
    if (saved) {
      meals = saved.meals;
      changes = saved.changes;
      renderHome(); // no AI request: this is the saved menu
      return;
    }
    meals = null;
    changes = 0;
    await generate(0);
  }

  return { showHome, showRecipes: renderRecipes };
}
