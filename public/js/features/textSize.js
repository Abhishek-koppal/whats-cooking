// Feature: the "Aa" button that makes all text bigger. The choice is remembered on the phone.
// (All sizes in style.css are in rem, so changing the page's base size scales everything.)

const KEY = "wc.text.v1";

function read() {
  try { return localStorage.getItem(KEY) === "large"; } catch { return false; }
}

function write(large) {
  try { localStorage.setItem(KEY, large ? "large" : "normal"); } catch { /* private mode: just don't remember */ }
}

export function initTextSize(button) {
  const apply = (large) => {
    if (large) document.documentElement.dataset.text = "large";
    else delete document.documentElement.dataset.text;
    button.setAttribute("aria-pressed", String(large));
  };
  apply(read());
  button.addEventListener("click", () => {
    const large = document.documentElement.dataset.text !== "large";
    apply(large);
    write(large);
  });
}
