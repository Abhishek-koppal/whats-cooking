// Pictures for the dishes, drawn by the phone itself: a big emoji on a soft coloured tile.
// This costs nothing, needs no internet and no image rights. The AI only says what KIND of
// dish it is ("dal", "flatbread"...) and the phone picks the picture.

import { el } from "./ui.js";

export const SLOT_LABEL = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

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
  plate: "🍽️",
};

const TINT = { breakfast: "#fff1cf", lunch: "#e6f2df", dinner: "#fde3d3" };

export function dishTile(meal) {
  const tile = el("span", { className: "tile", text: EMOJI[meal.art] ?? EMOJI.plate, attrs: { "aria-hidden": "true" } });
  tile.style.background = TINT[meal.slot] ?? "#f3ece3";
  return tile;
}
