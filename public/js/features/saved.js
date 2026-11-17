// Feature: Saved recipes. The recipes the person kept with the heart button (favStore.js).
// Everything is stored on the phone, so opening a saved recipe needs no AI request.

import { el } from "../ui.js";
import { t, difficultyText } from "../i18n.js";
import { dishTile } from "../dishArt.js";
import { loadFavourites, removeFavourite } from "../favStore.js";
import { recipeBody } from "../recipeView.js";

const metaOf = (recipe) =>
  [
    recipe.timeMinutes ? t("min", { n: recipe.timeMinutes }) : "",
    recipe.servings ? t(recipe.servings === 1 ? "servings.one" : "servings.other", { n: recipe.servings }) : "",
    difficultyText(recipe.difficulty),
  ].filter(Boolean).join(" · ");

export function initSaved({ container, go }) {
  function remove(recipe) {
    let sure = false; // removing takes two taps
    const button = el("button", { className: "link danger", text: t("fav.remove"), attrs: { type: "button" } });
    button.addEventListener("click", () => {
      if (!sure) {
        sure = true;
        button.textContent = t("fav.removeSure");
        return;
      }
      removeFavourite(recipe.id);
      show();
    });
    return el("div", { className: "form-links" }, el("span"), button);
  }

  function card(recipe) {
    const body = recipeBody(recipe);
    body.append(remove(recipe));
    return el(
      "details",
      { className: "recipe" },
      el(
        "summary",
        {},
        dishTile(recipe),
        el("span", { className: "meal-body" }, el("span", { className: "meal-name", text: recipe.name }), el("span", { className: "meal-meta", text: metaOf(recipe) }))
      ),
      body
    );
  }

  function show() {
    const saved = loadFavourites();
    container.replaceChildren(
      el("button", { className: "link back", text: t("back.home"), attrs: { type: "button" }, on: { click: () => go("home") } }),
      el("h2", { text: t("fav.title") }),
      el("p", { className: "lead", text: t("fav.lead") }),
      ...(saved.length ? saved.map(card) : [el("div", { className: "plan-box" }, el("p", { text: t("fav.empty") }))])
    );
  }

  return { show };
}
