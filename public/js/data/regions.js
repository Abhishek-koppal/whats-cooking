// The list of states, regions and diets.
// Used by the browser (to build the questions) AND by the server (to check the answers),
// so there is only one list to maintain.
//
// To ask a follow-up question for another state, add it to SUB_REGIONS below.

export const OTHER_STATE = "Somewhere else";

export const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // Union territories
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

// "dishes" are hints for the AI, not strict rules. They help it pick the right style of food.
export const SUB_REGIONS = {
  Karnataka: [
    {
      id: "north",
      label: "North Karnataka",
      dishes: "jolada rotti (jowar flatbread), girmit, ennegayi, mirchi bajji, shenga chutney pudi",
    },
    {
      id: "south",
      label: "South Karnataka",
      dishes: "ragi mudde with saaru, bisi bele bath, akki rotti, puliyogare, vangi bath",
    },
    {
      id: "coastal",
      label: "Coastal Karnataka",
      dishes: "neer dosa, kori rotti, Mangalorean fish or chicken curry, ghee roast, patrode",
    },
  ],
};

export const DIETS = [
  { id: "veg", label: "Vegetarian", hint: "No meat, fish or eggs" },
  { id: "nonveg", label: "Non-vegetarian", hint: "Meat, fish and eggs are fine" },
];

export function isKnownState(state) {
  return state === OTHER_STATE || STATES.includes(state);
}

export function subRegionsOf(state) {
  return SUB_REGIONS[state] ?? [];
}

export function findSubRegion(state, id) {
  return subRegionsOf(state).find((r) => r.id === id) ?? null;
}

export function isKnownDiet(id) {
  return DIETS.some((d) => d.id === id);
}

// "North Karnataka", or just "Kerala" when there is no follow-up question, or "" for "Somewhere else".
export function describeRegion(state, regionId) {
  if (state === OTHER_STATE) return "";
  const sub = findSubRegion(state, regionId);
  return sub ? sub.label : state;
}
