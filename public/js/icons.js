// Simple line icons (drawn as SVG), so no image files are needed and they take the text colour.
// Each icon is a list of [tag, attributes] shapes on a 24 x 24 grid.

const SVG_NS = "http://www.w3.org/2000/svg";

const ICONS = {
  home: [
    ["path", { d: "M3 10.5 12 3l9 7.5" }],
    ["path", { d: "M5 9v12h14V9" }],
    ["path", { d: "M10 21v-6h4v6" }],
  ],
  calendar: [
    ["path", { d: "M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" }],
    ["path", { d: "M3 9h18M8 2v4M16 2v4" }],
    ["path", { d: "M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" }],
  ],
  chef: [
    ["path", { d: "M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z" }],
    ["path", { d: "M6 17h12" }],
  ],
  fridge: [
    ["path", { d: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" }],
    ["path", { d: "M5 10h14M9 5v2M9 13v3" }],
  ],
  cart: [
    ["circle", { cx: "8", cy: "21", r: "1" }],
    ["circle", { cx: "19", cy: "21", r: "1" }],
    ["path", { d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" }],
  ],
  users: [
    ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
    ["circle", { cx: "9", cy: "7", r: "4" }],
    ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" }],
  ],
};

export function icon(name, size = 28) {
  const svg = document.createElementNS(SVG_NS, "svg");
  const attrs = {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.8",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  };
  for (const [key, value] of Object.entries(attrs)) svg.setAttribute(key, String(value));

  for (const [tag, shape] of ICONS[name] ?? []) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(shape)) node.setAttribute(key, value);
    svg.append(node);
  }
  return svg;
}
