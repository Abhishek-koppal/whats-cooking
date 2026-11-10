// Feature: the "Today's menu" home screen and the recipes view.
//
// Cost control: the menu is asked from the AI ONCE per day (all four items (breakfast, lunch, snacks, dinner) with full recipes in
// one request) and saved on the phone. Opening the app again, or tapping "View today's recipes",
// shows the saved copy and uses no AI quota. Only "Suggest a different menu" asks again, and
// that is limited to a couple of times a day.

import { getPlan } from "../api.js";
import { el } from "../ui.js";
import { t, getLang, getLocale, difficultyText } from "../i18n.js";
import { SLOT_LABEL, dishTile } from "../dishArt.js";
import { loadPlan, savePlan, recentDishes, recordDishes, MAX_CHANGES_PER_DAY } from "../planStore.js";

export function greetingFor(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return { text: t("greeting.morning"), icon: "☀️" };
  if (hour < 17) return { text: t("greeting.afternoon"), icon: "🌤️" };
  return { text: t("greeting.evening"), icon: "🌙" };
}

// Which meal is coming up, by the time of day.
export function nextSlotFor(now = new Date()) {
  const hour = now.getHours();
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 18) return "snacks";
  return "dinner";
}

const metaOf = (meal) => [meal.timeMinutes ? t("min", { n: meal.timeMinutes }) : "", difficultyText(meal.difficulty)].filter(Boolean).join(" · ");

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
      el("h2", { text: t("today.failed") }),
      el("p", { className: "error", text: message, attrs: { role: "alert" } }),
      el("button", { className: "primary", text: t("today.tryAgain"), attrs: { type: "button" }, on: { click: () => generate(0) } }),
      el("div", { className: "home-links" }, textButton(t("today.cookWith"), () => go("cook")))
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
                meal.slot === upNext ? el("span", { className: "tag", text: t("today.upNext") }) : ""
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
          el("h2", { text: greet.text }),
          el("p", { className: "meta", text: `${now.toLocaleDateString(getLocale(), { weekday: "long" })} · ${t("today.tagline")}` })
        ),
        el("span", { className: "chef", text: "🧑‍🍳", attrs: { "aria-hidden": "true" } })
      ),
      el(
        "div",
        { className: "plan-box" },
        el("p", { className: "eyebrow", text: t("today.eyebrow") }),
        el("h3", { text: family ? t("today.readyFamily") : t("today.readySingle") }),
        el("p", { text: family ? t("today.textFamily") : t("today.textSingle") })
      ),
      el("h3", { className: "section-title", text: t("today.meals") }),
      list,
      el("button", { className: "primary dark", text: t("today.viewRecipes"), attrs: { type: "button" }, on: { click: () => go("recipes") } }),
      notice ? el("p", { className: "error", text: notice, attrs: { role: "alert" } }) : "",
      el(
        "div",
        { className: "home-links" },
        left > 0
          ? textButton(t("today.another", { n: left }), () => generate(changes + 1))
          : el("span", { className: "home-note", text: t("today.noMore") }),
        textButton(t("today.cookWith"), () => go("cook"))
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
          meal.servedWith ? el("p", { className: "serve", text: t("recipe.serveWith", { x: meal.servedWith.replace(/^serve(d)? with\s+/i, "") }) }) : "",
          el("h4", { text: t("recipe.need") }),
          el("ul", {}, ...meal.ingredients.map((i) => el("li", { text: [i.quantity, i.name].filter(Boolean).join(" ") }))),
          el("h4", { text: t("recipe.how") }),
          el("ol", { className: "steps" }, ...meal.steps.map((step) => el("li", { text: step }))),
          meal.tip ? el("p", { className: "tip", text: t("recipe.tip", { x: meal.tip }) }) : ""
        )
      )
    );

    recipesEl.replaceChildren(
      el("button", { className: "link back", text: t("recipes.back"), attrs: { type: "button" }, on: { click: () => go("home") } }),
      el("h2", { text: t("recipes.title") }),
      ...cards
    );
    recipesEl.querySelector("details[open]")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  // Asks the AI for a menu. newChanges is 0 for the day's first menu, then 1, 2 for re-makes.
  async function generate(newChanges) {
    if (busy) return;
    busy = true;
    const hadMenu = meals !== null && newChanges > 0;
    renderLoading(hadMenu ? t("today.finding") : t("today.planning"));

    const prefs = getPrefs();
    const lang = getLang(); // the language this menu is made in, even if the person switches meanwhile
    const planKey = { ...prefs, lang };
    try {
      const data = await getPlan({
        state: prefs.state,
        region: prefs.region,
        diet: prefs.diet,
        people: prefs.people,
        avoid: recentDishes(), // yesterday's dishes (and today's, when re-making), so it changes
      });
      savePlan(planKey, data.meals, newChanges);
      recordDishes(data.meals.map((m) => m.name));
      if (getLang() !== lang) {
        // the language was switched while waiting: this menu is saved for later, now show the right language
        busy = false;
        return await showHome(); // (await, so the "finally" below does not reset busy too early)
      }
      meals = data.meals;
      changes = newChanges;
      renderHome();
    } catch (err) {
      if (hadMenu) renderHome(err.message); // keep showing the menu we already had
      else renderError(err.message);
    } finally {
      busy = false;
    }
  }

  async function showHome() {
    const saved = loadPlan({ ...getPrefs(), lang: getLang() });
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
