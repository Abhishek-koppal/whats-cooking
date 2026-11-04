// Starts the app and decides which screen to show.
// Each feature lives in js/features/ and is connected here.

import { loadPrefs, savePrefs } from "./prefs.js";
import { describeRegion, DIETS } from "./data/regions.js";
import { startOnboarding } from "./features/onboarding.js";
import { initRecipeForm } from "./features/recipe.js";

const onboardingEl = document.getElementById("onboarding");
const appEl = document.getElementById("app");
const summaryEl = document.getElementById("prefs-summary");

let prefs = loadPrefs(); // null the first time, so the questions are shown

const cuisineEl = document.getElementById("cuisine");

// The home region only applies to Indian food, so for Continental and Chinese we show the diet alone.
function summarize(p) {
  const diet = DIETS.find((d) => d.id === p.diet)?.label ?? "";
  const place = cuisineEl.value === "Indian" ? describeRegion(p.state, p.region) : "";
  return "Cooking for: " + [place, diet].filter(Boolean).join(" · ");
}

function showApp() {
  onboardingEl.hidden = true;
  appEl.hidden = false;
  summaryEl.textContent = summarize(prefs);
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
cuisineEl.addEventListener("change", () => {
  if (prefs && !appEl.hidden) summaryEl.textContent = summarize(prefs);
});

if (prefs) showApp();
else showQuestions(null);

// Makes the app installable ("Add to Home Screen").
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
