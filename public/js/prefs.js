// Remembers the person's answers (state, part of state, diet) on THIS phone only.
// Nothing is sent to a server except along with each recipe request.

import { isKnownState, isKnownDiet, findSubRegion, subRegionsOf } from "./data/regions.js";

const KEY = "wc.prefs.v1";

// Returns a clean copy of the answers, or null if they are missing or don't make sense.
export function cleanPrefs(p) {
  if (!p || !isKnownState(p.state) || !isKnownDiet(p.diet)) return null;
  const needsRegion = subRegionsOf(p.state).length > 0;
  const region = findSubRegion(p.state, p.region) ? p.region : null;
  if (needsRegion && !region) return null;
  return { state: p.state, region, diet: p.diet };
}

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? cleanPrefs(JSON.parse(raw)) : null;
  } catch {
    return null; // storage blocked or corrupted: just ask the questions again
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Private browsing can block storage. The app still works for this visit.
  }
}
