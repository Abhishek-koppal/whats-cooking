// Service worker: lets the app install and open quickly.
// It only caches the app's own screens. It never touches /api, so recipes are always fresh.
//
// WHEN YOU ADD A NEW FRONTEND FILE: add it to SHELL below and bump the CACHE number.

const CACHE = "rasoi-v6";
const SHELL = [
  "/",
  "/style.css",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/js/main.js",
  "/js/api.js",
  "/js/ui.js",
  "/js/prefs.js",
  "/js/planStore.js",
  "/js/dishArt.js",
  "/js/icons.js",
  "/js/data/regions.js",
  "/data/regions.json",
  "/js/features/onboarding.js",
  "/js/features/recipe.js",
  "/js/features/today.js",
  "/js/features/nav.js",
  "/js/features/textSize.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) {
    return; // let the browser handle it normally
  }
  // Network first (so updates show up), fall back to the saved copy if offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
