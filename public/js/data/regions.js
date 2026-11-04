// States, regions and diets for the browser.
// The list itself lives in /data/regions.json, which the Python server reads too,
// so there is only one list to edit. To add a follow-up question for another state,
// add it under "subRegions" in that JSON file.

export let STATES = [];
export let OTHER_STATE = "";
export let DIETS = [];
let SUB_REGIONS = {};

// Call this once, before anything else uses the lists (main.js does).
// STATES, OTHER_STATE and DIETS are "live" exports: they fill in as soon as this finishes.
export async function loadRegions() {
  const response = await fetch("/data/regions.json");
  if (!response.ok) throw new Error("Could not load the app's data.");
  const data = await response.json();
  STATES = data.states;
  OTHER_STATE = data.otherState;
  DIETS = data.diets;
  SUB_REGIONS = data.subRegions;
}

export function isKnownState(state) {
  return state === OTHER_STATE || STATES.includes(state);
}

export function subRegionsOf(state) {
  return SUB_REGIONS[state] ?? [];
}

export function findSubRegion(state, id) {
  return subRegionsOf(state).find((r) => r.id === id) ?? null;
}

export function isKnownDiet(id) {
  return DIETS.some((d) => d.id === id);
}

// "North Karnataka", or just "Kerala" when there is no follow-up question, or "" for "Somewhere else".
export function describeRegion(state, regionId) {
  if (state === OTHER_STATE) return "";
  const sub = findSubRegion(state, regionId);
  return sub ? sub.label : state;
}
