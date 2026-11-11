// The one place that talks to our backend.

import { t, getLang } from "./i18n.js";

// What to show for a failed request. The words come from the language files, so they are shown in the
// person's language (the server's own messages are English).
function problemText(status, serverMessage) {
  if (status === 429) return t("err.busy");
  if (status === 504) return t("err.slow");
  if (status === 502 || status === 503) return t("err.service");
  if (status === 400 && serverMessage) return serverMessage; // e.g. "Please choose between 1 and 12 servings."
  return t("err.generic");
}

async function postJson(url, payload) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, lang: getLang() }), // lang: the AI writes in this language
    });
  } catch {
    // fetch only throws when the phone could not reach the server at all
    throw new Error(t("err.network"));
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(problemText(response.status, data.error));
  return data;
}

export const getRecipe = (payload) => postJson("/api/recipe", payload);
export const getPlan = (payload) => postJson("/api/plan", payload);
export const getWeek = (payload) => postJson("/api/week", payload);
