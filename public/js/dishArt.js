// Pictures for the dishes, drawn by the phone itself: a big emoji on a soft tile (the tile colours are in style.css).
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

export function dishTile(meal) {
  const tile = el("span", { className: "tile", text: EMOJI[meal.art] ?? EMOJI.plate, attrs: { "aria-hidden": "true", "data-slot": meal.slot ?? "" } });
  return tile;
}
