// Feature: the "Today" home screen and the recipes view.
//
// The weekly plan (features/mealplan.js, weekStore.js) is the ONE source of what is cooked. Today's four meals
// here are today's row of that plan, so this screen and the Meal plan screen always agree. If there is no plan
// yet, one is made (once, for the whole week) when the app opens.
//
// Cost control: opening the app costs no AI quota once the week is saved. Recipes are written on demand, once a
// day, for exactly the four dishes of today (the first time "View today's recipes" or a meal is tapped).

import { getPlan } from "../api.js";
import { el } from "../ui.js";
import { t, getLang, getLocale, difficultyText } from "../i18n.js";
import { SLOT_LABEL, dishTile } from "../dishArt.js";
import { loadRecipes, saveRecipes, todayKey } from "../planStore.js";
import { loadWeek, todaysMeals, plansLeft } from "../weekStore.js";
import { requestWeek } from "../weekService.js";

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

// The weekly plan knows the time; the difficulty only comes with the recipe.
const metaOf = (meal) => [meal.timeMinutes ? t("min", { n: meal.timeMinutes }) : "", difficultyText(meal.difficulty)].filter(Boolean).join(" · ");

const textButton = (text, onClick) =>
  el("button", { className: "link", text, attrs: { type: "button" }, on: { click: onClick } });

// homeEl / recipesEl are the two screens; go(view, arg) is main.js's way of switching screens.
export function initToday({ homeEl, recipesEl, getPrefs, go }) {
  let meals = null; // today's meals, from the weekly plan
  let busy = false; // a weekly plan is being made
  let recipesBusy = false;
  let autoTriedFor = ""; // one automatic try per language and day, so a failing server is not asked again and again

  const back = () => el("button", { className: "link back", text: t("recipes.back"), attrs: { type: "button" }, on: { click: () => go("home") } });

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
      el("button", { className: "primary", text: t("today.tryAgain"), attrs: { type: "button" }, on: { click: generate } }),
      el("div", { className: "home-links" }, textButton(t("today.cookWith"), () => go("cook")))
    );
  }

  // No plan (and none is being made): explain, and offer the button.
  function renderNoPlan() {
    const now = new Date();
    homeEl.replaceChildren(
      el(
        "div",
        { className: "today-head" },
        el(
          "div",
          {},
          el("h2", { text: greetingFor(now).text }),
          el("p", { className: "meta", text: `${now.toLocaleDateString(getLocale(), { weekday: "long" })} · ${t("today.tagline")}` })
        )
      ),
      el("div", { className: "plan-box" }, el("p", { className: "eyebrow", text: t("today.eyebrow") }), el("h3", { text: t("week.title") }), el("p", { text: t("week.empty") })),
      plansLeft() > 0
        ? el("button", { className: "primary dark", text: t("week.plan"), attrs: { type: "button" }, on: { click: generate } })
        : el("p", { className: "home-note", text: t("week.noMore") }),
      el("div", { className: "home-links" }, textButton(t("today.cookWith"), () => go("cook")))
    );
  }

  function renderHome() {
    const now = new Date();
    const prefs = getPrefs();
    const greet = greetingFor(now);
    const family = prefs.people > 1;
    const upNext = nextSlotFor(now);

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
      el("div", { className: "home-links" }, textButton(t("today.seeWeek"), () => go("mealplan")), textButton(t("today.cookWith"), () => go("cook")))
    );
  }

  // ------------------------------------------------------------ recipes

  function renderRecipes(recipes, openSlot) {
    const opened = openSlot ?? nextSlotFor();

    const cards = recipes.map((meal) =>
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

    recipesEl.replaceChildren(back(), el("h2", { text: t("recipes.title") }), ...cards);
    recipesEl.querySelector("details[open]")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  function renderRecipesStatus(content) {
    recipesEl.replaceChildren(back(), el("h2", { text: t("recipes.title") }), ...content);
  }

  // Shows today's recipes. They are written once a day for the four dishes of the plan, then saved on the phone.
  async function showRecipes(openSlot) {
    if (!meals) return go("home");
    const asked = meals;
    const key = { ...getPrefs(), lang: getLang() };

    const saved = loadRecipes(key, asked);
    if (saved) return renderRecipes(saved, openSlot);
    if (recipesBusy) return;

    recipesBusy = true;
    renderRecipesStatus([
      el("div", { className: "loading" }, el("div", { className: "chef", text: "🧑‍🍳", attrs: { "aria-hidden": "true" } }), el("p", { className: "lead", text: t("recipes.writing"), attrs: { role: "status" } })),
    ]);
    try {
      const prefs = getPrefs();
      const data = await getPlan({
        state: prefs.state,
        region: prefs.region,
        diet: prefs.diet,
        people: prefs.people,
        dishes: Object.fromEntries(asked.map((meal) => [meal.slot, meal.name])), // the plan's dishes, so nothing is re-chosen
      });
      saveRecipes(key, asked, data.meals);
      recipesBusy = false;
      if (!recipesEl.hidden && getLang() === key.lang) renderRecipes(data.meals, openSlot);
    } catch (err) {
      recipesBusy = false;
      renderRecipesStatus([
        el("p", { className: "error", text: err.message, attrs: { role: "alert" } }),
        el("button", { className: "primary", text: t("today.tryAgain"), attrs: { type: "button" }, on: { click: () => showRecipes(openSlot) } }),
      ]);
    }
  }

  // ------------------------------------------------------------ the plan

  // Asks for a weekly plan starting today.
  async function generate() {
    if (busy) return;
    busy = true;
    renderLoading(t("week.planning"));
    const lang = getLang(); // the language this plan is made in, even if the person switches meanwhile
    try {
      await requestWeek({ prefs: getPrefs(), lang, startKey: todayKey() });
      busy = false;
      await showHome(); // draws today's row of the plan (or, if the language changed meanwhile, that language's state)
    } catch (err) {
      busy = false;
      if (getLang() !== lang) return showHome();
      renderError(err.message);
    }
  }

  async function showHome() {
    if (busy) return;
    const lang = getLang();
    const plan = loadWeek({ ...getPrefs(), lang });
    const today = plan && todaysMeals(plan);
    if (today) {
      meals = today;
      renderHome(); // no AI request: this is today's row of the saved plan
      return;
    }
    meals = null;
    const once = lang + todayKey();
    if (autoTriedFor !== once && plansLeft() > 0) {
      autoTriedFor = once;
      await generate();
    } else {
      renderNoPlan();
    }
  }

  return { showHome, showRecipes };
}
