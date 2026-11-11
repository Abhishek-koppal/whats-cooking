// Languages. Every word the app shows comes from js/i18n/<language>.js through t("key").
// To add a language: copy en.js to a new file (for example ta.js), translate the values, add it to
// DICTS and LANGS below, and add the file to the list in sw.js. The AI writes the recipes in the chosen
// language too (the backend knows the same codes: see LANGUAGES in backend/common.py).

import en from "./i18n/en.js";
import hi from "./i18n/hi.js";
import kn from "./i18n/kn.js";

const DICTS = { en, hi, kn };

// label = how the language is written in its own script (what the picker shows)
export const LANGS = [
  { id: "en", label: "English", locale: "en-IN" },
  { id: "hi", label: "हिन्दी", locale: "hi-IN" },
  { id: "kn", label: "ಕನ್ನಡ", locale: "kn-IN" },
];

const KEY = "wc.lang.v1";
const listeners = [];

function saved() {
  try {
    const id = localStorage.getItem(KEY);
    return id && DICTS[id] ? id : null;
  } catch {
    return null;
  }
}

// First visit: use the phone's own language if we have it, otherwise English.
function guess() {
  const wanted = String(globalThis.navigator?.language ?? "en").slice(0, 2).toLowerCase();
  return DICTS[wanted] ? wanted : "en";
}

let current = saved() ?? guess();
if (globalThis.document) document.documentElement.lang = current;

export const getLang = () => current;
export const getLocale = () => LANGS.find((l) => l.id === current)?.locale ?? "en-IN";

export function setLang(id) {
  if (!DICTS[id] || id === current) return;
  current = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // storage blocked: the choice just won't be remembered
  }
  document.documentElement.lang = id;
  for (const fn of listeners) fn(id);
}

export const onLangChange = (fn) => listeners.push(fn);

// t("week.another", { n: 2 }) -> "Suggest a different plan (2 left today)"
export function t(key, vars = {}) {
  const text = DICTS[current][key] ?? en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

// Fills the fixed text in index.html: data-i18n (text), data-i18n-placeholder, data-i18n-aria (aria-label).
export function applyStatic(root = document) {
  for (const node of root.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
  for (const node of root.querySelectorAll("[data-i18n-placeholder]")) node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  for (const node of root.querySelectorAll("[data-i18n-aria]")) node.setAttribute("aria-label", t(node.dataset.i18nAria));
}

// Small helpers used in several places
export const peopleText = (n) => t(n === 1 ? "people.one" : "people.other", { n });
// Like t(), but uses `fallback` (instead of showing the key) when a text has no translation. For words that come from data files.
export function tOr(key, fallback) {
  return DICTS[current][key] ?? en[key] ?? false ? t(key) : fallback;
}

export const difficultyText = (d) => (d ? tOr(`difficulty.${d}`, d) : "");
