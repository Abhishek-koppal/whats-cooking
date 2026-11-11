// Feature: the weekly Shopping list.
//
// It is made from the weekly plan (weekStore.js): the dishes of the days still to come are sent to the AI ONCE, which
// adds up the ingredients into one list. The list is saved on the phone (shoppingStore.js), so opening this screen
// again costs nothing. It appears by itself the first time the screen is opened after a plan exists.

import { getShopping } from "../api.js";
import { el } from "../ui.js";
import { t, getLang } from "../i18n.js";
import { icon } from "../icons.js";
import { todayKey } from "../planStore.js";
import { loadWeek } from "../weekStore.js";
import {
  loadShopping, saveShopping, listsLeft, noteListAsked, daysToShopFor, setChecked, addCustomItem, removeCustomItem, itemId,
} from "../shoppingStore.js";

const CATEGORIES = ["vegetables", "fruits", "dairy", "grains-pulses", "spices", "pantry", "meat-fish-eggs", "bakery-snacks", "other"];
const textButton = (text, onClick) => el("button", { className: "link", text, attrs: { type: "button" }, on: { click: onClick } });
const line = (name, quantity) => (quantity ? `${name} – ${quantity}` : name);

// Copies text. The modern way first; the old way for browsers or pages that do not allow it.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const box = el("textarea", { attrs: { "aria-hidden": "true", readonly: "" } });
    box.value = text;
    box.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.append(box);
    box.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    box.remove();
    return ok;
  }
}

// container is the screen's <section>; go(view) is main.js's way of switching screens.
export function initShopping({ container, getPrefs, go }) {
  let busy = false;
  let autoTriedFor = ""; // one automatic try per plan, so a failing server is not asked again and again

  const back = () => el("button", { className: "link back", text: t("back.home"), attrs: { type: "button" }, on: { click: () => go("home") } });
  const keys = () => ({ ...getPrefs(), lang: getLang() }); // what the saved list is filed under

  function renderLoading(text) {
    container.replaceChildren(
      back(),
      el("div", { className: "loading" }, el("div", { className: "chef", text: "🧑‍🍳", attrs: { "aria-hidden": "true" } }), el("p", { className: "lead", text, attrs: { role: "status" } }))
    );
  }

  function renderNeedPlan() {
    container.replaceChildren(
      back(),
      el("h2", { text: t("shop.title") }),
      el("p", { className: "lead", text: t("shop.needPlan") }),
      el("button", { className: "primary", text: t("shop.toPlan"), attrs: { type: "button" }, on: { click: () => go("mealplan") } })
    );
  }

  // There is a plan but no list (and none is being made): offer the button.
  function renderEmpty(plan, notice = "") {
    container.replaceChildren(
      back(),
      el("h2", { text: t("shop.title") }),
      el("p", { className: "lead", text: t("shop.lead") }),
      listsLeft() > 0
        ? el("button", { className: "primary", text: notice ? t("today.tryAgain") : t("shop.make"), attrs: { type: "button" }, on: { click: () => generate(plan) } })
        : el("p", { className: "home-note", text: t("shop.noMore") }),
      notice ? el("p", { className: "error", text: notice, attrs: { role: "alert" } }) : ""
    );
  }

  function renderList(plan, list, notice = "") {
    const prefs = keys();
    const mine = list.custom.map((c) => ({ id: c.id, name: c.name, quantity: "", category: "mine" }));
    const everything = [...list.items.map((i) => ({ ...i, id: itemId(i.name) })), ...mine];
    const done = everything.filter((i) => list.checked[i.id]).length;

    const redraw = () => renderList(plan, loadShopping(prefs, plan) ?? list);

    const row = (item) =>
      el(
        "li",
        { className: "shop-row" },
        el(
          "label",
          { className: "shop-item" },
          el("input", {
            attrs: { type: "checkbox", ...(list.checked[item.id] ? { checked: "" } : {}) },
            on: {
              change: (event) => {
                setChecked(prefs, plan, item.id, event.target.checked);
                redraw();
              },
            },
          }),
          el("span", { className: "shop-box", attrs: { "aria-hidden": "true" } }, icon("check")),
          el("span", { className: "shop-text", text: line(item.name, item.quantity) })
        ),
        item.category === "mine"
          ? el("button", { className: "shop-remove", attrs: { type: "button", "aria-label": `${t("shop.remove")}: ${item.name}` }, text: "×", on: { click: () => { removeCustomItem(prefs, plan, item.id); redraw(); } } })
          : ""
      );

    const sections = [...CATEGORIES, "mine"]
      .map((category) => ({ category, items: everything.filter((i) => i.category === category || (category === "other" && !CATEGORIES.includes(i.category) && i.category !== "mine")) }))
      .filter((s) => s.items.length);

    const input = el("input", { className: "shop-add-input", attrs: { type: "text", maxlength: "60", placeholder: t("shop.add"), "aria-label": t("shop.add"), enterkeyhint: "done", autocomplete: "off" } });
    const add = () => {
      const name = input.value.replace(/\s+/g, " ").trim();
      if (!name) return;
      addCustomItem(prefs, plan, name);
      redraw();
      container.querySelector(".shop-add-input")?.focus();
    };
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        add();
      }
    });

    const copy = el("button", { className: "shop-copy", attrs: { type: "button" } }, icon("copy"), el("span", { text: t("shop.copy") }));
    copy.addEventListener("click", async () => {
      // what is still to buy; if everything is ticked, the whole list
      const left = everything.filter((i) => !list.checked[i.id]);
      const chosen = left.length ? left : everything;
      const text = [t("shop.title"), ...sections.flatMap((s) => {
        const these = chosen.filter((i) => s.items.includes(i));
        return these.length ? ["", t(`shop.cat.${s.category}`), ...these.map((i) => `• ${line(i.name, i.quantity)}`)] : [];
      })].join("\n");
      const ok = await copyText(text);
      copy.querySelector("span").textContent = ok ? t("shop.copied") : t("err.generic");
      setTimeout(() => (copy.querySelector("span").textContent = t("shop.copy")), 2000);
    });

    const fill = el("span");
    fill.style.width = `${everything.length ? Math.round((done / everything.length) * 100) : 0}%`;
    const bar = el("div", { className: "shop-bar", attrs: { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(everything.length), "aria-valuenow": String(done) } }, fill);

    container.replaceChildren(
      back(),
      el("p", { className: "lead", text: t("shop.lead") }),
      el(
        "section",
        { className: "shop-card" },
        el("div", { className: "shop-head" }, el("h2", { text: t("shop.title") }), el("span", { className: "shop-pill", text: t("shop.count", { done, total: everything.length }), attrs: { "aria-live": "polite" } })),
        bar,
        ...sections.map((s) =>
          el("div", { className: "shop-section" }, el("h3", { className: "shop-cat", text: t(`shop.cat.${s.category}`) }), el("ul", { className: "shop-list" }, ...s.items.map(row)))
        ),
        el("div", { className: "shop-add" }, input, el("button", { className: "shop-add-btn", text: t("shop.addBtn"), attrs: { type: "button" }, on: { click: add } })),
        copy
      ),
      notice ? el("p", { className: "error", text: notice, attrs: { role: "alert" } }) : "",
      el("div", { className: "home-links" }, listsLeft() > 0 ? textButton(t("shop.again", { n: listsLeft() }), () => generate(plan, list)) : el("span", { className: "home-note", text: t("shop.noMore") }))
    );
  }

  // Asks the AI for the list. A list made again keeps the ticks and the person's own items.
  async function generate(plan, previous = null) {
    if (busy) return;
    busy = true;
    renderLoading(t("shop.making"));
    const prefs = keys();
    try {
      noteListAsked();
      const live = getPrefs();
      const data = await getShopping({ state: live.state, region: live.region, diet: live.diet, people: live.people, days: daysToShopFor(plan) });
      saveShopping(prefs, plan, data.items);
      busy = false;
      show();
    } catch (err) {
      busy = false;
      if (getLang() !== prefs.lang) return show();
      if (previous) renderList(plan, previous, err.message);
      else renderEmpty(plan, err.message);
    }
  }

  // Draws the saved list; makes one by itself the first time there is a plan but no list.
  function show() {
    if (busy) return;
    const plan = loadWeek(keys());
    if (!plan) return renderNeedPlan();
    const list = loadShopping(keys(), plan);
    if (list) return renderList(plan, list);
    const once = getLang() + "|" + todayKey() + "|" + plan.start;
    if (autoTriedFor !== once && listsLeft() > 0) {
      autoTriedFor = once;
      return generate(plan);
    }
    renderEmpty(plan);
  }

  return { show };
}
