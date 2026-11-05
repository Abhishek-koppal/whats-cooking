// Starts the app and decides which screen to show.
// Each feature lives in js/features/ and is connected here.
//
// Screens inside the app: "home" (today's menu), "recipes" (today's recipes), "cook" (recipe from
// the ingredients you have). Before those, the questions screen appears on a first visit.

import { loadPrefs, savePrefs } from "./prefs.js";
import { loadRegions, describeRegion, DIETS } from "./data/regions.js";
import { startOnboarding } from "./features/onboarding.js";
import { initRecipeForm } from "./features/recipe.js";
import { initToday } from "./features/today.js";
import { el } from "./ui.js";

const onboardingEl = document.getElementById("onboarding");
const appEl = document.getElementById("app");
const summaryEl = document.getElementById("prefs-summary");
const cuisineEl = document.getElementById("cuisine");
const homeEl = document.getElementById("home");
const recipesEl = document.getElementById("recipes");
const cookEl = document.getElementById("cook");

// The line under the title. The home region only applies to Indian food, so on the
// "cook with what I have" screen it is hidden for Continental and Chinese.
function summarize(p, view) {
  const diet = DIETS.find((d) => d.id === p.diet)?.label ?? "";
  const cooking = view === "cook";
  const place = !cooking || cuisineEl.value === "Indian" ? describeRegion(p.state, p.region) : "";
  const people = cooking ? "" : `${p.people} ${p.people === 1 ? "person" : "people"}`;
  return "Cooking for: " + [place, diet, people].filter(Boolean).join(" · ");
}

function start() {
  let prefs = loadPrefs(); // null the first time, so the questions are shown
  let view = "home";

  const today = initToday({ homeEl, recipesEl, getPrefs: () => prefs, go });

  function go(next, arg) {
    view = next;
    homeEl.hidden = next !== "home";
    recipesEl.hidden = next !== "recipes";
    cookEl.hidden = next !== "cook";
    summaryEl.textContent = summarize(prefs, view);
    if (next === "home") today.showHome();
    if (next === "recipes") today.showRecipes(arg);
    globalThis.scrollTo?.(0, 0);
  }

  function showApp() {
    onboardingEl.hidden = true;
    appEl.hidden = false;
    go("home");
  }

  function showQuestions(initial) {
    appEl.hidden = true;
    onboardingEl.hidden = false;
    startOnboarding({
      container: onboardingEl,
      initial,
      onDone: (answers) => {
        prefs = answers;
        savePrefs(prefs);
        showApp();
      },
      onCancel: initial ? showApp : undefined, // can only cancel when there is something to go back to
    });
  }

  initRecipeForm({ getPrefs: () => prefs });
  document.getElementById("change-prefs").addEventListener("click", () => showQuestions(prefs));
  document.getElementById("back-home").addEventListener("click", () => go("home"));
  cuisineEl.addEventListener("change", () => {
    if (prefs && view === "cook") summaryEl.textContent = summarize(prefs, view);
  });

  if (prefs) showApp();
  else showQuestions(null);
}

// The lists of states and diets come from /data/regions.json, so load them first.
try {
  await loadRegions();
  start();
} catch {
  onboardingEl.hidden = false;
  onboardingEl.replaceChildren(
    el("p", { className: "lead", text: "Couldn't load the app. Please check your internet and try again." }),
    el("button", { className: "primary", text: "Try again", attrs: { type: "button" }, on: { click: () => location.reload() } })
  );
}

// Makes the app installable ("Add to Home Screen").
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
