// Remembers the person's saved (favourite) recipes on THIS phone. Saving costs nothing: the whole recipe is kept,
// so opening it later needs no AI request.

const FAV_KEY = "wc.fav.v1";
export const MAX_FAVOURITES = 60;
const ART = ["rice", "flatbread", "curry", "dal", "dosa", "snack", "egg", "noodles", "soup", "salad", "sweet", "sandwich", "fruit", "drink", "plate"];

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAV_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return []; // storage blocked or corrupted: behave as if nothing was saved
  }
}

function write(list) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false; // private browsing can block storage
  }
}

const text = (value, max) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");
export const idOf = (name) => text(name, 120).toLowerCase();

// One recipe, made safe: known fields only. Returns null if it is not a usable recipe.
function clean(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = text(raw.name, 120);
  const ingredients = (Array.isArray(raw.ingredients) ? raw.ingredients : [])
    .filter((i) => i && typeof i.name === "string" && i.name.trim())
    .slice(0, 40)
    .map((i) => ({ name: text(i.name, 80), quantity: text(i.quantity, 40) }));
  const steps = (Array.isArray(raw.steps) ? raw.steps : []).map((s) => text(s, 600)).filter(Boolean).slice(0, 20);
  if (!name || !ingredients.length || !steps.length) return null;

  const minutes = Number(raw.timeMinutes);
  const servings = Number(raw.servings);
  return {
    id: idOf(name),
    name,
    art: ART.includes(raw.art) ? raw.art : "plate",
    timeMinutes: Number.isInteger(minutes) && minutes > 0 && minutes <= 600 ? minutes : null,
    difficulty: ["Easy", "Medium", "Hard"].includes(raw.difficulty) ? raw.difficulty : "",
    servings: Number.isInteger(servings) && servings > 0 && servings <= 12 ? servings : null,
    ingredients,
    steps,
    servedWith: text(raw.servedWith, 200),
    tip: text(raw.tip, 300),
    familyNote: text(raw.familyNote, 300),
    savedAt: Number.isFinite(raw.savedAt) ? raw.savedAt : Date.now(),
  };
}

// Newest first.
export const loadFavourites = () => read().map(clean).filter(Boolean).slice(0, MAX_FAVOURITES);

export const isFavourite = (name) => loadFavourites().some((f) => f.id === idOf(name));

// Saves a recipe. "saved", "exists" (already saved) or "full" / "failed".
export function saveFavourite(recipe) {
  const item = clean({ ...recipe, savedAt: Date.now() });
  if (!item) return "failed";
  const list = loadFavourites();
  if (list.some((f) => f.id === item.id)) return "exists";
  if (list.length >= MAX_FAVOURITES) return "full";
  return write([item, ...list]) ? "saved" : "failed";
}

export const removeFavourite = (id) => write(loadFavourites().filter((f) => f.id !== id));
