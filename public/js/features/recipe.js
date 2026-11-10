// Feature: the recipe form and the recipe card.

import { getRecipe } from "../api.js";
import { setStatus, setBusy } from "../ui.js";
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

  fillList(document.getElementById("recipe-ingredients"), recipe.ingredients, (i) => `${i.quantity} ${i.name}`);
  fillList(document.getElementById("recipe-steps"), recipe.steps, (s) => s);

  const tipEl = document.getElementById("recipe-tip");
  tipEl.hidden = !recipe.tip;
  tipEl.textContent = recipe.tip ? t("recipe.tip", { x: recipe.tip }) : "";

  const resultEl = document.getElementById("result");
  resultEl.hidden = false;
  resultEl.scrollIntoView?.({ behavior: "smooth", block: "start" });
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
  const setServings = (n) => (servingsEl.value = Math.min(12, Math.max(1, n)));
  document.getElementById("minus").addEventListener("click", () => setServings(Number(servingsEl.value) - 1));
  document.getElementById("plus").addEventListener("click", () => setServings(Number(servingsEl.value) + 1));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const prefs = getPrefs();
    if (!prefs) {
      setStatus(t("cook.answerFirst"), true);
      return;
    }

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
      setStatus(err.message, true);
    } finally {
      setBusy(goBtn, false, t("cook.go"));
    }
  });
}
