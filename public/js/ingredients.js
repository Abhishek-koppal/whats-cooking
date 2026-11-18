// Checks the "Cook with what I have" box before anything is sent: only ingredients, nothing else.
// The server checks the same things again (backend/recipe.py check_ingredient_text); this just answers at once.

const MAX_ITEMS = 25;
const MAX_WORDS_PER_ITEM = 6;
const ALLOWED = /^[\p{L}\p{M}\p{Nd} ,;.\-'’()\/&]+$/u; // letters of any language and their marks, digits, a few separators

// True when the text is just a list of ingredients (a name made of letters can only be caught by the AI).
export function isIngredientList(text) {
  const tidy = String(text).replace(/[\r\n]+/g, ", ").replace(/\s+/g, " ").trim();
  if (!tidy || !ALLOWED.test(tidy)) return false;

  if (/\p{L}\.\p{L}/u.test(tidy)) return false; // evil.com
  const segments = tidy.split(/[,;&]/).map((segment) => segment.trim()).filter(Boolean);
  if (segments.some((segment) => !/[\p{L}\p{Nd}]/u.test(segment))) return false; // a segment of only symbols, like "--"
  const items = segments.map((segment) => segment.replace(/^[ .\-'’]+|[ .\-'’]+$/g, "")).filter(Boolean);
  if (!items.length || items.length > MAX_ITEMS) return false;
  return items.every(
    (item) =>
      /\p{L}/u.test(item) &&
      item.split(" ").length <= MAX_WORDS_PER_ITEM &&
      /[\p{L}\p{M}]{2}/u.test(item) && // a real word of two letters or more, not "u" or "x2"
      !/\d[\p{L}\p{M}]+\d/u.test(item) // 394u293u432: letters stuck between numbers
  );
}
