// Frontend: runs in the browser. It never sees the API key.
// It only sends the form to our own backend (/api/recipe) and shows the answer.

const form = document.getElementById("form");
const ingredientsEl = document.getElementById("ingredients");
const servingsEl = document.getElementById("servings");
const cuisineEl = document.getElementById("cuisine");
const goBtn = document.getElementById("go");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

// "+" and "−" buttons for servings (kept between 1 and 12)
function setServings(n) {
  servingsEl.value = Math.min(12, Math.max(1, n));
}
document.getElementById("minus").addEventListener("click", () => setServings(Number(servingsEl.value) - 1));
document.getElementById("plus").addEventListener("click", () => setServings(Number(servingsEl.value) + 1));

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? "error" : "";
}

function setBusy(busy) {
  goBtn.disabled = busy;
  goBtn.textContent = busy ? "Thinking…" : "Get recipe";
}

// textContent (not innerHTML) so nothing the AI writes can run as code.
function fillList(listEl, items, formatter) {
  listEl.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement("li");
      li.textContent = formatter(item);
      return li;
    })
  );
}

function showRecipe(recipe) {
  document.getElementById("recipe-name").textContent = recipe.recipeName;

  const bits = [`${recipe.servings} serving${recipe.servings === 1 ? "" : "s"}`];
  if (recipe.cuisine) bits.push(recipe.cuisine);
  if (recipe.timeMinutes) bits.push(`about ${recipe.timeMinutes} min`);
  document.getElementById("recipe-meta").textContent = bits.join(" · ");

  fillList(document.getElementById("recipe-ingredients"), recipe.ingredients, (i) => `${i.quantity} ${i.name}`);
  fillList(document.getElementById("recipe-steps"), recipe.steps, (s) => s);

  const tipEl = document.getElementById("recipe-tip");
  tipEl.hidden = !recipe.tip;
  tipEl.textContent = recipe.tip ? `Tip: ${recipe.tip}` : "";

  resultEl.hidden = false;
  resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(true);
  setStatus("Thinking up a recipe…");
  resultEl.hidden = true;

  try {
    const response = await fetch("/api/recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredients: ingredientsEl.value,
        servings: Number(servingsEl.value),
        cuisine: cuisineEl.value,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");

    showRecipe(data);
    setStatus("");
  } catch (err) {
    // A TypeError from fetch means the phone could not reach the server at all.
    const offline = err instanceof TypeError;
    setStatus(offline ? "Can't reach the server. Please check your internet." : err.message, true);
  } finally {
    setBusy(false);
  }
});

// Makes the app installable ("Add to Home Screen").
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
