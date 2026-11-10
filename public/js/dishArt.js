// Pictures for the dishes, drawn by the phone itself: a big emoji on a soft tile (the tile colours are in style.css).
// This costs nothing, needs no internet and no image rights. The AI only says what KIND of
// dish it is ("dal", "flatbread"...) and the phone picks the picture.

import { el } from "./ui.js";
import { t } from "./i18n.js";

// The name of a meal slot in the current language (read it as SLOT_LABEL.lunch, or SLOT_LABEL[slot]).
export const SLOT_LABEL = {
  get breakfast() { return t("slot.breakfast"); },
  get lunch() { return t("slot.lunch"); },
  get snacks() { return t("slot.snacks"); },
  get dinner() { return t("slot.dinner"); },
};

const EMOJI = {
  rice: "🍚",
  flatbread: "🫓",
  curry: "🍛",
  dal: "🥘",
  dosa: "🥞",
  snack: "🥟",
  egg: "🍳",
  noodles: "🍜",
  soup: "🍲",
  salad: "🥗",
  sweet: "🍮",
  sandwich: "🥪",
  fruit: "🍎",
  drink: "🥤",
  plate: "🍽️",
};

export function dishTile(meal) {
  const tile = el("span", { className: "tile", text: EMOJI[meal.art] ?? EMOJI.plate, attrs: { "aria-hidden": "true", "data-slot": meal.slot ?? "" } });
  return tile;
}
