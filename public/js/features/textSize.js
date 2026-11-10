// Feature: the "Aa" button opens a small panel with a slider that sets how big all the text is.
// The choice is remembered on the phone. (Every size in style.css is in rem, so changing the page's
// base size, through the --text-scale number, scales the whole app.)

const KEY = "wc.text.v1";
export const MIN_SCALE = 0.8;
export const MAX_SCALE = 1.6;

// Saved as a number like "1.25". The old on/off button saved "large" (now 1.25) or "normal".
export function readScale() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "large") return 1.25;
    const n = Number(raw);
    return raw !== null && n >= MIN_SCALE && n <= MAX_SCALE ? n : 1;
  } catch {
    return 1;
  }
}

function saveScale(scale) {
  try {
    localStorage.setItem(KEY, String(scale));
  } catch {
    /* private mode: just don't remember */
  }
}

export function initTextSize({ button, panel, range, output, reset }) {
  const apply = (scale) => {
    document.documentElement.style.setProperty("--text-scale", String(scale));
    range.value = String(Math.round(scale * 100));
    output.textContent = `${Math.round(scale * 100)}%`;
    reset.hidden = Math.round(scale * 100) === 100;
  };

  const setOpen = (open) => {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  };

  range.min = String(MIN_SCALE * 100);
  range.max = String(MAX_SCALE * 100);
  apply(readScale());
  setOpen(false);

  range.addEventListener("input", () => {
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(range.value) / 100));
    apply(scale);
    saveScale(scale);
  });
  reset.addEventListener("click", () => {
    apply(1);
    saveScale(1);
  });
  button.addEventListener("click", () => setOpen(panel.hidden));
  document.addEventListener("click", (event) => {
    if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      setOpen(false);
      button.focus();
    }
  });
}
