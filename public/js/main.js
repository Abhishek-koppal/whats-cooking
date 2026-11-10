// Starts the app and decides which screen to show.
// Each feature lives in js/features/ and is connected here.
//
// Screens inside the app: "home" (today's menu and the feature grid), "recipes" (today's recipes),
// "cook" (recipe from the ingredients you have) and "soon" (a feature that is not built yet).
// Before those, the questions screen appears on a first visit.

import { loadPrefs, savePrefs } from "./prefs.js";
import { loadRegions, describeRegion, DIETS } from "./data/regions.js";
import { startOnboarding } from "./features/onboarding.js";
import { initRecipeForm } from "./features/recipe.js";
import { initToday } from "./features/today.js";
import { renderNav, renderSoon } from "./features/nav.js";
import { initTextSize } from "./features/textSize.js";
import { t, tOr, LANGS, getLang, setLang, onLangChange, applyStatic, peopleText } from "./i18n.js";
import { el } from "./ui.js";

const onboardingEl = document.getElementById("onboarding");
const appEl = document.getElementById("app");
const summaryEl = document.getElementById("prefs-summary");
const cuisineEl = document.getElementById("cuisine");
const homeEl = document.getElementById("home");
const recipesEl = document.getElementById("recipes");
const cookEl = document.getElementById("cook");
const soonEl = document.getElementById("soon");
const navEl = document.getElementById("nav");

// The line under the title. The home region only applies to Indian food, so on the
// "cook with what I have" screen it is hidden for Continental and Chinese.
function summarize(p, view) {
  const dietEntry = DIETS.find((d) => d.id === p.diet);
  const diet = dietEntry ? tOr(`diet.${dietEntry.id}`, dietEntry.label) : "";
  const cooking = view === "cook";
  const place = !cooking || cuisineEl.value === "Indian" ? describeRegion(p.state, p.region) : "";
  const people = cooking ? "" : peopleText(p.people);
  return t("prefs.cookingFor") + " " + [place, diet, people].filter(Boolean).join(" · ");
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
    soonEl.hidden = next !== "soon";
    navEl.hidden = next !== "home"; // the feature grid belongs to the home screen
    summaryEl.textContent = summarize(prefs, view);
    if (next === "home") today.showHome();
    if (next === "recipes") today.showRecipes(arg);
    if (next === "soon") {
      soonFeature = arg;
      renderSoon(soonEl, arg, { onBack: () => go("home") });
    }
    globalThis.scrollTo?.(0, 0);
  }

  function showApp() {
    onboardingEl.hidden = true;
    appEl.hidden = false;
    go("home");
  }

  let questions = null; // the questions screen, while it is showing

  function showQuestions(initial) {
    appEl.hidden = true;
    onboardingEl.hidden = false;
    questions = startOnboarding({
      container: onboardingEl,
      initial,
      onDone: (answers) => {
        questions = null;
        prefs = answers;
        savePrefs(prefs);
        showApp();
      },
      onCancel: initial ? () => { questions = null; showApp(); } : undefined, // can only cancel when there is something to go back to
    });
  }

  let soonFeature = null; // which "coming soon" page is showing (to redraw it in a new language)
  const drawNav = () => renderNav(navEl, { onPick: (feature) => go(feature.view, feature) });
  drawNav();

  // The name at the top goes back to the home screen (from anywhere, also from the questions when changing them).
  document.getElementById("logo").addEventListener("click", () => {
    if (!prefs) return; // first visit: the questions have to be answered first
    questions = null;
    showApp();
  });

  // Switching language: redraw the words, then the current screen. The menu is asked from the AI again in
  // the new language (once; it is then saved like any other day's menu).
  onLangChange(() => {
    applyStatic();
    fillLanguages();
    drawNav();
    if (questions) return questions.rerender();
    if (!prefs) return;
    if (view === "recipes") return go("home");
    go(view, view === "soon" ? soonFeature : undefined);
  });
  initRecipeForm({ getPrefs: () => prefs });
  document.getElementById("change-prefs").addEventListener("click", () => showQuestions(prefs));
  document.getElementById("back-home").addEventListener("click", () => go("home"));
  cuisineEl.addEventListener("change", () => {
    if (prefs && view === "cook") summaryEl.textContent = summarize(prefs, view);
  });

  if (prefs) showApp();
  else showQuestions(null);
}

// The language picker shows each language in its own script.
const langEl = document.getElementById("lang");
function fillLanguages() {
  langEl.replaceChildren(...LANGS.map((l) => el("option", { text: l.label, attrs: { value: l.id } })));
  langEl.value = getLang();
}
langEl.addEventListener("change", () => setLang(langEl.value));
fillLanguages();
applyStatic();

initTextSize({
  button: document.getElementById("text-size"),
  panel: document.getElementById("size-panel"),
  range: document.getElementById("size-range"),
  output: document.getElementById("size-value"),
  reset: document.getElementById("size-reset"),
});

// The lists of states and diets come from /data/regions.json, so load them first.
try {
  await loadRegions();
  start();
} catch {
  onboardingEl.hidden = false;
  onboardingEl.replaceChildren(
    el("p", { className: "lead", text: t("err.load") }),
    el("button", { className: "primary", text: t("today.tryAgain"), attrs: { type: "button" }, on: { click: () => location.reload() } })
  );
}

// Makes the app installable ("Add to Home Screen").
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
