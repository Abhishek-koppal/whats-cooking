// Feature: the recipe form and the recipe card.

import { getRecipe } from "../api.js";
import { setStatus, setBusy } from "../ui.js";
import { el } from "../ui.js";
import { icon } from "../icons.js";
import { copyText } from "../clipboard.js";
import { favButton } from "../recipeView.js";
import { namesIn } from "../names.js";
import { isIngredientList } from "../ingredients.js";
import { t, tOr } from "../i18n.js";

// textContent (not innerHTML) so nothing the AI writes can run as code.
function fillList(listEl, items, format) {
  listEl.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement("li");
      li.textContent = format(item);
      return li;
    })
  );
}

function showRecipe(recipe) {
  document.getElementById("recipe-name").textContent = recipe.recipeName;

  const bits = [t(recipe.servings === 1 ? "servings.one" : "servings.other", { n: recipe.servings })];
  if (recipe.cuisine) bits.push(tOr(`cuisine.${recipe.cuisine}`, recipe.cuisine));
  if (recipe.timeMinutes) bits.push(t("minAbout", { n: recipe.timeMinutes }));
  document.getElementById("recipe-meta").textContent = bits.join(" · ");

  document.getElementById("recipe-fav").replaceChildren(
    favButton({
      name: recipe.recipeName, art: "plate", timeMinutes: recipe.timeMinutes, servings: recipe.servings,
      ingredients: recipe.ingredients, steps: recipe.steps, tip: recipe.tip, familyNote: recipe.familyNote,
    })
  );

  const noteEl = document.getElementById("recipe-family-note");
  noteEl.hidden = !recipe.familyNote;
  noteEl.textContent = recipe.familyNote ? t("recipe.familyNote", { x: recipe.familyNote }) : "";

  const line = (i) => [i.quantity, i.name].filter(Boolean).join(" ");
  const have = recipe.ingredients.filter((i) => i.have !== false);
  const missing = recipe.missing ?? recipe.ingredients.filter((i) => i.have === false);

  document.getElementById("recipe-have-title").hidden = have.length === 0;
  fillList(document.getElementById("recipe-ingredients"), have, line);
  showToBuy(recipe.recipeName, missing, line);
  fillList(document.getElementById("recipe-steps"), recipe.steps, (s) => s);

  const tipEl = document.getElementById("recipe-tip");
  tipEl.hidden = !recipe.tip;
  tipEl.textContent = recipe.tip ? t("recipe.tip", { x: recipe.tip }) : "";

  const resultEl = document.getElementById("result");
  resultEl.hidden = false;
  resultEl.scrollIntoView?.({ behavior: "smooth", block: "start" });
}

// "What you still need to buy": the missing ingredients and a button that copies them as a shopping list.
function showToBuy(dish, missing, line) {
  const box = document.getElementById("recipe-buy");
  if (!missing.length) {
    box.replaceChildren(el("p", { className: "all-set", text: t("recipe.haveAll") }));
    return;
  }

  const copy = el("button", { className: "shop-copy", attrs: { type: "button" } }, icon("copy"), el("span", { text: t("recipe.copyList") }));
  copy.addEventListener("click", async () => {
    const text = [t("recipe.listTitle", { x: dish }), ...missing.map((i) => "• " + line(i))].join("\n");
    const ok = await copyText(text);
    copy.querySelector("span").textContent = ok ? t("shop.copied") : t("err.generic");
    setTimeout(() => (copy.querySelector("span").textContent = t("recipe.copyList")), 2000);
  });

  box.replaceChildren(
    el("h3", { text: t("recipe.buy") }),
    el("ul", {}, ...missing.map((i) => el("li", { text: line(i) }))),
    copy
  );
}

// getPrefs() gives the saved answers (state, region, diet) at the moment of each request.
export function initRecipeForm({ getPrefs }) {
  const form = document.getElementById("form");
  const ingredientsEl = document.getElementById("ingredients");
  const servingsEl = document.getElementById("servings");
  const cuisineEl = document.getElementById("cuisine");
  const goBtn = document.getElementById("go");
  const resultEl = document.getElementById("result");

  // "+" and "−" buttons (servings stay between 1 and 12)
  let chosen = false; // once the person picks a number of servings, it is left alone
  const setServings = (n) => (servingsEl.value = Math.min(12, Math.max(1, n)));
  document.getElementById("minus").addEventListener("click", () => { chosen = true; setServings(Number(servingsEl.value) - 1); });
  document.getElementById("plus").addEventListener("click", () => { chosen = true; setServings(Number(servingsEl.value) + 1); });
  servingsEl.addEventListener("input", () => { chosen = true; });
  // The "only ingredients, please" message sits right under the box, so it is seen on a small screen too.
  const problemEl = document.getElementById("ingredients-error");
  const ingredientsProblem = (message) => {
    problemEl.hidden = !message;
    problemEl.textContent = message;
    if (message) ingredientsEl.setAttribute("aria-invalid", "true");
    else ingredientsEl.removeAttribute("aria-invalid");
  };
  ingredientsEl.addEventListener("input", () => ingredientsProblem(""));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const prefs = getPrefs();
    if (!prefs) {
      setStatus(t("cook.answerFirst"), true);
      return;
    }

    // Only ingredients: anything else is turned back here, before a request is made.
    if (!isIngredientList(ingredientsEl.value)) {
      ingredientsProblem(t("cook.invalid"));
      ingredientsEl.focus();
      return;
    }
    const names = namesIn(ingredientsEl.value);
    if (names.length) {
      ingredientsProblem(t("cook.notFood", { x: names.slice(0, 5).join(", ") }));
      ingredientsEl.focus();
      return;
    }
    ingredientsProblem("");

    setBusy(goBtn, true, t("cook.go"));
    setStatus(t("cook.thinking"));
    resultEl.hidden = true;

    try {
      const recipe = await getRecipe({
        ingredients: ingredientsEl.value,
        servings: Number(servingsEl.value),
        cuisine: cuisineEl.value,
        state: prefs.state,
        region: prefs.region,
        diet: prefs.diet,
      });
      showRecipe(recipe);
      setStatus("");
    } catch (err) {
      if (err.code === "bad_ingredients" || err.code === "not_food") {
        ingredientsProblem(err.message);
        setStatus("");
      } else setStatus(err.message, true);
    } finally {
      setBusy(goBtn, false, t("cook.go"));
    }
  });

  // The servings start at the size of the household (the family), until the person chooses another number.
  return { useHouseholdSize: (people) => { if (!chosen) setServings(people); } };
}
