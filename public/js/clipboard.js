// Copying text to the clipboard (used by the shopping list and the recipe's "still to buy" list).

import { el } from "./ui.js";

// Copies text. The modern way first; the old way for browsers or pages that do not allow it.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const box = el("textarea", { attrs: { "aria-hidden": "true", readonly: "" } });
    box.value = text;
    box.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.append(box);
    box.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    box.remove();
    return ok;
  }
}
