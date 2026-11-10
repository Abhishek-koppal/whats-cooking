// Feature: "Similar recipes on ..." links under every recipe.
//
// The recipes in this app are written by the AI in its own words. These links do NOT mean the recipe
// came from those sites: they only open a search of each site for the same dish, so you can compare.
// To add or remove a site, edit the list below (name + domain).

import { el } from "../ui.js";

export const SOURCES = [
  { name: "Archana's Kitchen", domain: "archanaskitchen.com" },
  { name: "Pavi's Kitchen", domain: "paviskitchen.com" },
  { name: "Savi Ruchi", domain: "savi-ruchi.com" },
  { name: "Hebbar's Kitchen", domain: "hebbarskitchen.com" },
  { name: "Swasthi's Recipes", domain: "indianhealthyrecipes.com" },
];

export function searchUrl(dish, domain) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${dish} recipe site:${domain}`)}`;
}

// A small block: "SIMILAR RECIPES ON" followed by one link per site.
export function sourceLinks(dish) {
  return el(
    "div",
    { className: "sources" },
    el("p", { className: "eyebrow", text: "Similar recipes on" }),
    el(
      "div",
      { className: "source-list" },
      ...SOURCES.map((site) =>
        el("a", { className: "source-link", text: site.name, attrs: { href: searchUrl(dish, site.domain), target: "_blank", rel: "noopener noreferrer" } })
      )
    )
  );
}

export const SOURCES_NOTE =
  "These recipes are written by AI in its own words. The links above only search those sites for the same dish, so you can compare. Nothing here is copied from them.";
