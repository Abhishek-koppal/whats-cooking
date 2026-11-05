// The one place that talks to our backend.

async function postJson(url, payload) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // fetch only throws when the phone could not reach the server at all
    throw new Error("Can't reach the server. Please check your internet.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export const getRecipe = (payload) => postJson("/api/recipe", payload);
export const getPlan = (payload) => postJson("/api/plan", payload);
