// Small helpers shared by all features.

import { t } from "./i18n.js";

export function setStatus(message, isError = false) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = message;
  statusEl.className = isError ? "error" : "";
}

export function setBusy(button, busy, idleText) {
  button.disabled = busy;
  button.textContent = busy ? t("cook.busy") : idleText;
}

// Builds an element safely (text is added as text, never as HTML).
//   el("button", { className: "primary", text: "Next", attrs: { type: "button" }, on: { click: fn } })
export function el(tag, { className, text, attrs, on } = {}, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attrs ?? {})) node.setAttribute(name, value);
  for (const [event, handler] of Object.entries(on ?? {})) node.addEventListener(event, handler);
  node.append(...children);
  return node;
}
