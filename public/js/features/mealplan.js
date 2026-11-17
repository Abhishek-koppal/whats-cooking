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
import { icon } from "../icons.js";
import { loadWeek, plansLeft, swapsLeft, replaceMeal, dateOf, daysBetween, isStale, SLOTS } from "../weekStore.js";
import { staleNotice } from "./family.js";
import { requestWeek, requestSwap } from "../weekService.js";

const textButton = (text, onClick) => el("button", { className: "link", text, attrs: { type: "button" }, on: { click: onClick } });

// container is the screen's <section>; go(view) is main.js's way of switching screens.
export function initMealPlan({ container, getPrefs, go }) {
  let busy = false;
  let swapping = null; // { index, slot } while a dish is being swapped
  let lastSwap = null; // { index, slot, previous, meal }: what the last swap changed, so it can be undone

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

  // The small "swap this dish" button at the end of a dish (not for days that are gone).
  function swapButton(plan, index, slot, name) {
    const button = el("button", { className: "swap-btn", attrs: { type: "button", "aria-label": t("swap.label", { x: name }), title: t("swap.label", { x: name }) }, on: { click: () => swap(plan, index, slot) } }, icon("swap", 20));
    button.disabled = swapping !== null;
    return button;
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
        ...SLOTS.map((slot) => {
          const meal = plan.days[index][slot];
          const working = swapping?.index === index && swapping.slot === slot;
          const fresh = lastSwap?.index === index && lastSwap.slot === slot;
          return el(
            "div",
            { className: "dm" + (working ? " swapping" : "") + (fresh ? " swapped" : "") },
            dishTile({ ...meal, slot }),
            el("span", { className: "meal-body" }, el("span", { className: "meal-slot", text: SLOT_LABEL[slot] }), el("span", { className: "meal-name", text: working ? t("swap.finding") : meal.name })),
            index >= offset && swapsLeft() > 0 ? swapButton(plan, index, slot, meal.name) : ""
          );
        })
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
      isStale(plan) ? staleNotice(left > 0 ? { text: t("family.staleBtn"), onClick: () => generate(plan.start, plan) } : null) : "",
      el("p", { className: "lead", text: t("week.lead") }),
      el("ul", { className: "week" }, ...[offset, ...upcoming, ...gone].map((i) => dayCard(plan, i, offset))),
      notice ? el("p", { className: "error", text: notice, attrs: { role: "alert" } }) : "",
      swapsLeft() === 0 ? el("p", { className: "home-note", text: t("swap.noMore") }) : "",
      el(
        "div",
        { className: "home-links" },
        left > 0 ? textButton(t("week.another", { n: left }), () => generate(plan.start, plan)) : el("span", { className: "home-note", text: t("week.noMore") })
      ),
      lastSwap
        ? el(
            "div",
            { className: "swap-note", attrs: { role: "status" } },
            el("span", { text: t("swap.done", { from: lastSwap.previous.name, to: lastSwap.meal.name }) }),
            textButton(t("swap.undo"), undo)
          )
        : ""
    );
  }

  // Swaps one dish for another. The rest of the plan stays; the home screen follows because it reads the same plan.
  async function swap(plan, index, slot) {
    if (busy || swapping || swapsLeft() <= 0) return;
    swapping = { index, slot };
    lastSwap = null;
    renderWeek(plan);

    const lang = getLang(); // the language this swap is made in, even if the person switches meanwhile
    try {
      const done = await requestSwap({ prefs: getPrefs(), lang, plan, index, slot });
      swapping = null;
      if (getLang() === lang) lastSwap = { index, slot, previous: done.previous, meal: done.meal };
      show();
    } catch (err) {
      swapping = null;
      show(getLang() === lang ? err.message : "");
    }
  }

  // Puts the previous dish back. Free: no request is made.
  function undo() {
    if (!lastSwap) return;
    const { index, slot, previous } = lastSwap;
    lastSwap = null;
    replaceMeal({ ...getPrefs(), lang: getLang() }, index, slot, previous);
    show();
  }

  // Asks the AI. A new plan starts today; a "different plan" keeps the week's own start, so its days stay in line.
  async function generate(startKey, previous = null) {
    if (busy) return;
    busy = true;
    lastSwap = null;
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
  function show(notice = "") {
    if (busy) return;
    const plan = loadWeek({ ...getPrefs(), lang: getLang() });
    if (plan) renderWeek(plan, notice);
    else renderEmpty();
  }

  // Coming back to the screen later shows no undo: it is only for the swap just made.
  return { show: () => { if (!swapping) lastSwap = null; show(); } };
}
