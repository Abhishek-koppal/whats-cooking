// How one written recipe is drawn: used by today's recipes and by the saved recipes, so they always look the same.
// Also the "Save recipe" heart button.

import { el } from "./ui.js";
import { t } from "./i18n.js";
import { icon } from "./icons.js";
import { isFavourite, saveFavourite, removeFavourite, idOf, MAX_FAVOURITES } from "./favStore.js";

// The heart button for a recipe { name, ingredients, steps, ... }. It saves or un-saves, and says which.
export function favButton(recipe, { onChange } = {}) {
  const button = el("button", { className: "fav-btn", attrs: { type: "button" } });
  const note = el("span", { className: "fav-note", attrs: { role: "status" } });

  const draw = () => {
    const on = isFavourite(recipe.name);
    button.classList.toggle("on", on);
    button.setAttribute("aria-pressed", String(on));
    button.replaceChildren(icon("heart", 18), el("span", { text: on ? t("fav.saved") : t("fav.save") }));
  };
  button.addEventListener("click", () => {
    note.textContent = "";
    if (isFavourite(recipe.name)) removeFavourite(idOf(recipe.name));
    else {
      const result = saveFavourite(recipe);
      if (result === "full") note.textContent = t("fav.full", { n: MAX_FAVOURITES });
      else if (result === "failed") note.textContent = t("err.generic");
    }
    draw();
    onChange?.();
  });
  draw();
  return el("div", { className: "fav-row" }, button, note);
}

// The inside of a recipe card. `recipe` has ingredients [{name, quantity}] and steps; the rest is optional.
// `save` adds the heart button (pass the recipe to save, which may carry more than is shown).
export function recipeBody(recipe, { save = null, onSaveChange } = {}) {
  return el(
    "div",
    { className: "recipe-body" },
    save ? favButton(save, { onChange: onSaveChange }) : "",
    recipe.familyNote ? el("p", { className: "family-note", text: t("recipe.familyNote", { x: recipe.familyNote }) }) : "",
    recipe.servedWith ? el("p", { className: "serve", text: t("recipe.serveWith", { x: recipe.servedWith.replace(/^serve(d)? with\s+/i, "") }) }) : "",
    el("h4", { text: t("recipe.need") }),
    el("ul", {}, ...recipe.ingredients.map((i) => el("li", { text: [i.quantity, i.name].filter(Boolean).join(" ") }))),
    el("h4", { text: t("recipe.how") }),
    el("ol", { className: "steps" }, ...recipe.steps.map((step) => el("li", { text: step }))),
    recipe.tip ? el("p", { className: "tip", text: t("recipe.tip", { x: recipe.tip }) }) : ""
  );
}
