// The one place that talks to our backend.

export async function getRecipe(payload) {
  let response;
  try {
    response = await fetch("/api/recipe", {
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
