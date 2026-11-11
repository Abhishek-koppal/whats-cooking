// Feature: the weekly Meal plan (breakfast, lunch, snacks and dinner for 7 days).
//
// This is the ONE source of what is cooked: the home screen shows today's row of this plan.
//
// Cost control: the AI is asked ONCE for the whole week and the answer is saved on the phone for those 7 days.
// Asking is limited to a few times a day (see weekStore.js), and switching language shows that language's plan,
// or the button if there is none.

import { el } from "../ui.js";
import { t, getLang, getLocale } from "../i18n.js";
import { SLOT_LABEL, dishTile } from "../dishArt.js";
import { todayKey } from "../planStore.js";
import { loadWeek, plansLeft, dateOf, daysBetween, SLOTS } from "../weekStore.js";
import { requestWeek } from "../weekService.js";

const textButton = (text, onClick) => el("button", { className: "link", text, attrs: { type: "button" }, on: { click: onClick } });

// container is the screen's <section>; go(view) is main.js's way of switching screens.
export function initMealPlan({ container, getPrefs, go }) {
  let busy = false;

  const back = () => el("button", { className: "link back", text: t("back.home"), attrs: { type: "button" }, on: { click: () => go("home") } });

  function renderLoading(text) {
    container.replaceChildren(
      back(),
      el(
        "div",
        { className: "loading" },
        el("div", { className: "chef", text: "🧑‍🍳", attrs: { "aria-hidden": "true" } }),
        el("p", { className: "lead", text, attrs: { role: "status" } })
      )
    );
  }

  // No plan yet (or it has ended): explain, and offer the button.
  function renderEmpty(notice = "") {
    container.replaceChildren(
      back(),
      el("h2", { text: t("week.title") }),
      el("p", { className: "lead", text: t("week.empty") }),
      plansLeft() > 0
        ? el("button", { className: "primary", text: t("week.plan"), attrs: { type: "button" }, on: { click: () => generate(todayKey()) } })
        : el("p", { className: "home-note", text: t("week.noMore") }),
      notice ? el("p", { className: "error", text: notice, attrs: { role: "alert" } }) : ""
    );
  }

  // One day as a card: the weekday, the date, and the four meals.
  function dayCard(plan, index, offset) {
    const date = dateOf(plan.start, index);
    const locale = getLocale();
    const isToday = index === offset;
    return el(
      "li",
      { className: "day-card" + (isToday ? " today" : "") + (index < offset ? " past" : "") },
      el(
        "div",
        { className: "day-head" },
        el("h3", { text: date.toLocaleDateString(locale, { weekday: "long" }) }),
        el("span", { className: "meta", text: date.toLocaleDateString(locale, { day: "numeric", month: "short" }) }),
        isToday ? el("span", { className: "tag", text: t("week.today") }) : ""
      ),
      el(
        "div",
        { className: "day-meals" },
        ...SLOTS.map((slot) =>
          el(
            "div",
            { className: "dm" },
            dishTile({ ...plan.days[index][slot], slot }),
            el("span", { className: "meal-body" }, el("span", { className: "meal-slot", text: SLOT_LABEL[slot] }), el("span", { className: "meal-name", text: plan.days[index][slot].name }))
          )
        )
      )
    );
  }

  function renderWeek(plan, notice = "") {
    const today = todayKey();
    const offset = daysBetween(plan.start, today);
    const left = plansLeft(today);

    // Today first and larger, then the days to come, then the days already gone (faded).
    const order = [offset, ...plan.days.keys()].filter((i, n, all) => all.indexOf(i) === n);
    const upcoming = order.filter((i) => i > offset);
    const gone = order.filter((i) => i < offset);

    container.replaceChildren(
      back(),
      el("h2", { text: t("week.title") }),
      el("p", { className: "lead", text: t("week.lead") }),
      el("ul", { className: "week" }, ...[offset, ...upcoming, ...gone].map((i) => dayCard(plan, i, offset))),
      notice ? el("p", { className: "error", text: notice, attrs: { role: "alert" } }) : "",
      el(
        "div",
        { className: "home-links" },
        left > 0 ? textButton(t("week.another", { n: left }), () => generate(plan.start, plan)) : el("span", { className: "home-note", text: t("week.noMore") })
      )
    );
  }

  // Asks the AI. A new plan starts today; a "different plan" keeps the week's own start, so its days stay in line.
  async function generate(startKey, previous = null) {
    if (busy) return;
    busy = true;
    renderLoading(previous ? t("week.replanning") : t("week.planning"));

    const lang = getLang(); // the language this plan is made in, even if the person switches meanwhile
    try {
      await requestWeek({ prefs: getPrefs(), lang, startKey });
      busy = false;
      show(); // shows the plan in the language that is selected now (this one, or the one switched to meanwhile)
    } catch (err) {
      busy = false;
      if (getLang() !== lang) return show();
      if (previous) renderWeek(previous, err.message);
      else renderEmpty(err.message);
    }
  }

  // Draws the saved plan, or the button when there is none.
  function show() {
    if (busy) return;
    const plan = loadWeek({ ...getPrefs(), lang: getLang() });
    if (plan) renderWeek(plan);
    else renderEmpty();
  }

  return { show };
}
