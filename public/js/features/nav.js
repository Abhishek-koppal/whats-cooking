// Feature: the grid of feature buttons on the home screen.
//
// To connect a feature once it is built: change its `view` below to the name of its screen
// (and add that screen in index.html and main.js). Until then it opens a "Coming soon" page.

import { el } from "../ui.js";
import { icon } from "../icons.js";
import { t } from "../i18n.js";

export const FEATURES = [
  { id: "home", label: "Home", icon: "home", view: "home" },
  { id: "meal-plan", label: "Meal plan", icon: "calendar", view: "soon" },
  { id: "recipes", label: "Recipes", icon: "chef", view: "cook" }, // for now: a recipe from what you have
  { id: "fridge", label: "My fridge", icon: "fridge", view: "soon" },
  { id: "shopping", label: "Shopping", icon: "cart", view: "soon" },
  { id: "family", label: "My family", icon: "users", view: "soon" },
];

// Draws the six tiles. onPick(feature) is called when one is tapped.
export function renderNav(container, { active = "home", onPick }) {
  container.replaceChildren(
    ...FEATURES.map((feature) =>
      el(
        "button",
        {
          className: "nav-tile",
          attrs: { type: "button", ...(feature.id === active ? { "aria-current": "page" } : {}) },
          on: { click: () => onPick(feature) },
        },
        icon(feature.icon),
        el("span", { text: t(`nav.${feature.id}`) })
      )
    )
  );
}

// The page for a feature that is not built yet.
export function renderSoon(container, feature, { onBack }) {
  container.replaceChildren(
    el("button", { className: "link back", text: t("back.home"), attrs: { type: "button" }, on: { click: onBack } }),
    el(
      "div",
      { className: "soon" },
      icon(feature.icon, 56),
      el("h2", { text: t(`nav.${feature.id}`) }),
      el("p", { className: "lead", text: t("soon.text") })
    )
  );
}
