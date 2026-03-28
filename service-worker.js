const CACHE_NAME = "2cents-shell-403227a13302";
const RUNTIME_CACHE_NAME = "2cents-runtime-403227a13302";
const BASE_PATH = "/2cents";
const ROOT_URL = "/2cents/";
const OFFLINE_URL = "/2cents/offline";
const SERVICE_WORKER_URL = "/2cents/service-worker.js";
const PRECACHE_URLS = [
  "/2cents/",
  "/2cents/404.html",
  "/2cents/__next.!KHdvcmtzcGFjZSk.__PAGE__.txt",
  "/2cents/__next.!KHdvcmtzcGFjZSk.txt",
  "/2cents/__next._full.txt",
  "/2cents/__next._head.txt",
  "/2cents/__next._index.txt",
  "/2cents/__next._tree.txt",
  "/2cents/_next/static/3G-z7lHVhpIsZv8TxvtrA/_buildManifest.js",
  "/2cents/_next/static/3G-z7lHVhpIsZv8TxvtrA/_clientMiddlewareManifest.json",
  "/2cents/_next/static/3G-z7lHVhpIsZv8TxvtrA/_ssgManifest.js",
  "/2cents/_next/static/chunks/05be8470af537e1f.js",
  "/2cents/_next/static/chunks/0c5193fa392bfd8b.js",
  "/2cents/_next/static/chunks/19de2746f7981465.js",
  "/2cents/_next/static/chunks/5cc0dd67d2997557.css",
  "/2cents/_next/static/chunks/668f3e2e432cb275.js",
  "/2cents/_next/static/chunks/6964a6b1e6159263.js",
  "/2cents/_next/static/chunks/79632882bffe45ea.js",
  "/2cents/_next/static/chunks/7c04f7f7a65a8046.js",
  "/2cents/_next/static/chunks/7c92e96509cd355e.js",
  "/2cents/_next/static/chunks/82abf2d65f5428ae.js",
  "/2cents/_next/static/chunks/8eaf548ec742f28b.js",
  "/2cents/_next/static/chunks/9da905ce7ec8f6ec.js",
  "/2cents/_next/static/chunks/a6dad97d9634a72d.js",
  "/2cents/_next/static/chunks/c67a1b126b74ce9d.js",
  "/2cents/_next/static/chunks/d2be314c3ece3fbe.js",
  "/2cents/_next/static/chunks/eb22b83833708adb.js",
  "/2cents/_next/static/chunks/ef75a34def36ec00.js",
  "/2cents/_next/static/chunks/f2f58a7e93290fbb.js",
  "/2cents/_next/static/chunks/f6aee3506f1d8e35.js",
  "/2cents/_next/static/chunks/fa97e5db97254774.js",
  "/2cents/_next/static/chunks/ff1a16fafef87110.js",
  "/2cents/_next/static/chunks/turbopack-9ebc86bfc9a555f2.js",
  "/2cents/_next/static/media/favicon.0b3bf435.ico",
  "/2cents/_not-found",
  "/2cents/_not-found.txt",
  "/2cents/_not-found/__next._full.txt",
  "/2cents/_not-found/__next._head.txt",
  "/2cents/_not-found/__next._index.txt",
  "/2cents/_not-found/__next._not-found.__PAGE__.txt",
  "/2cents/_not-found/__next._not-found.txt",
  "/2cents/_not-found/__next._tree.txt",
  "/2cents/budget-setup",
  "/2cents/budget-setup.txt",
  "/2cents/budget-setup/__next.!KHdvcmtzcGFjZSk.budget-setup.__PAGE__.txt",
  "/2cents/budget-setup/__next.!KHdvcmtzcGFjZSk.budget-setup.txt",
  "/2cents/budget-setup/__next.!KHdvcmtzcGFjZSk.txt",
  "/2cents/budget-setup/__next._full.txt",
  "/2cents/budget-setup/__next._head.txt",
  "/2cents/budget-setup/__next._index.txt",
  "/2cents/budget-setup/__next._tree.txt",
  "/2cents/examples/2cents-budget-baseline-template.csv",
  "/2cents/examples/2cents-statement-bank-style-example.csv",
  "/2cents/examples/2cents-statement-template.csv",
  "/2cents/favicon.ico",
  "/2cents/icon.svg",
  "/2cents/imports",
  "/2cents/imports.txt",
  "/2cents/imports/__next.!KHdvcmtzcGFjZSk.imports.__PAGE__.txt",
  "/2cents/imports/__next.!KHdvcmtzcGFjZSk.imports.txt",
  "/2cents/imports/__next.!KHdvcmtzcGFjZSk.txt",
  "/2cents/imports/__next._full.txt",
  "/2cents/imports/__next._head.txt",
  "/2cents/imports/__next._index.txt",
  "/2cents/imports/__next._tree.txt",
  "/2cents/index.txt",
  "/2cents/manifest.webmanifest",
  "/2cents/monthly-review",
  "/2cents/monthly-review.txt",
  "/2cents/monthly-review/__next.!KHdvcmtzcGFjZSk.monthly-review.__PAGE__.txt",
  "/2cents/monthly-review/__next.!KHdvcmtzcGFjZSk.monthly-review.txt",
  "/2cents/monthly-review/__next.!KHdvcmtzcGFjZSk.txt",
  "/2cents/monthly-review/__next._full.txt",
  "/2cents/monthly-review/__next._head.txt",
  "/2cents/monthly-review/__next._index.txt",
  "/2cents/monthly-review/__next._tree.txt",
  "/2cents/offline",
  "/2cents/offline.txt",
  "/2cents/offline/__next._full.txt",
  "/2cents/offline/__next._head.txt",
  "/2cents/offline/__next._index.txt",
  "/2cents/offline/__next._tree.txt",
  "/2cents/offline/__next.offline.__PAGE__.txt",
  "/2cents/offline/__next.offline.txt",
  "/2cents/pwa/apple-touch-icon.png",
  "/2cents/pwa/icon-192.png",
  "/2cents/pwa/icon-512.png",
  "/2cents/pwa/icon-maskable-512.png",
  "/2cents/rules",
  "/2cents/rules.txt",
  "/2cents/rules/__next.!KHdvcmtzcGFjZSk.rules.__PAGE__.txt",
  "/2cents/rules/__next.!KHdvcmtzcGFjZSk.rules.txt",
  "/2cents/rules/__next.!KHdvcmtzcGFjZSk.txt",
  "/2cents/rules/__next._full.txt",
  "/2cents/rules/__next._head.txt",
  "/2cents/rules/__next._index.txt",
  "/2cents/rules/__next._tree.txt",
  "/2cents/settings",
  "/2cents/settings.txt",
  "/2cents/settings/__next.!KHdvcmtzcGFjZSk.settings.__PAGE__.txt",
  "/2cents/settings/__next.!KHdvcmtzcGFjZSk.settings.txt",
  "/2cents/settings/__next.!KHdvcmtzcGFjZSk.txt",
  "/2cents/settings/__next._full.txt",
  "/2cents/settings/__next._head.txt",
  "/2cents/settings/__next._index.txt",
  "/2cents/settings/__next._tree.txt",
  "/2cents/transactions",
  "/2cents/transactions.txt",
  "/2cents/transactions/__next.!KHdvcmtzcGFjZSk.transactions.__PAGE__.txt",
  "/2cents/transactions/__next.!KHdvcmtzcGFjZSk.transactions.txt",
  "/2cents/transactions/__next.!KHdvcmtzcGFjZSk.txt",
  "/2cents/transactions/__next._full.txt",
  "/2cents/transactions/__next._head.txt",
  "/2cents/transactions/__next._index.txt",
  "/2cents/transactions/__next._tree.txt"
];

// Only same-origin app shell and exported static assets are cached here.
// User-selected statement files come from local file inputs and are not cached by the service worker.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();

      await Promise.all(
        cacheKeys
          .filter(
            (cacheKey) =>
              cacheKey.startsWith("2cents-shell-") ||
              cacheKey.startsWith("2cents-runtime-"),
          )
          .filter(
            (cacheKey) =>
              cacheKey !== CACHE_NAME && cacheKey !== RUNTIME_CACHE_NAME,
          )
          .map((cacheKey) => caches.delete(cacheKey)),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE_NAME);
    await cache.put(request, response.clone());
  }

  return response;
}

async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  const networkResponsePromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(RUNTIME_CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => null);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkResponsePromise;

  if (networkResponse) {
    return networkResponse;
  }

  throw new Error("Network unavailable and no cached response exists.");
}

async function navigationResponse(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const rootResponse = await caches.match(ROOT_URL);

    if (rootResponse) {
      return rootResponse;
    }

    const offlineResponse = await caches.match(OFFLINE_URL);

    if (offlineResponse) {
      return offlineResponse;
    }

    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (requestUrl.pathname === SERVICE_WORKER_URL) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (
    requestUrl.pathname.startsWith(`${BASE_PATH || ""}/_next/`) ||
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "image" ||
    requestUrl.pathname.endsWith(".txt") ||
    requestUrl.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
