import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function normalizeBasePath(basePath) {
  if (!basePath || basePath === "/") {
    return "";
  }

  return basePath.startsWith("/") ? basePath.replace(/\/+$/, "") : `/${basePath.replace(/\/+$/, "")}`;
}

function collectFiles(directoryPath) {
  return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directoryPath, entry.name);

    if (entry.name === ".DS_Store") {
      return [];
    }

    if (entry.isDirectory()) {
      return collectFiles(absolutePath);
    }

    return [absolutePath];
  });
}

function toPrecacheUrl(filePath, exportDirectory, basePath) {
  const relativePath = path
    .relative(exportDirectory, filePath)
    .split(path.sep)
    .join("/");

  if (
    relativePath === "service-worker.js" ||
    relativePath.endsWith(".map")
  ) {
    return null;
  }

  if (relativePath === "index.html") {
    return `${basePath || ""}/`;
  }

  if (relativePath.endsWith(".html")) {
    const routePath = relativePath.replace(/\.html$/, "");

    if (routePath === "404") {
      return `${basePath || ""}/404.html`;
    }

    return `${basePath || ""}/${routePath}`;
  }

  return `${basePath || ""}/${relativePath}`;
}

function createServiceWorkerSource({
  basePath,
  cacheVersion,
  precacheUrls,
}) {
  const rootUrl = `${basePath || ""}/`;
  const offlineUrl = `${basePath || ""}/offline`;
  const serviceWorkerUrl = `${basePath || ""}/service-worker.js`;

  return `const CACHE_NAME = "2cents-shell-${cacheVersion}";
const RUNTIME_CACHE_NAME = "2cents-runtime-${cacheVersion}";
const BASE_PATH = ${JSON.stringify(basePath)};
const ROOT_URL = ${JSON.stringify(rootUrl)};
const OFFLINE_URL = ${JSON.stringify(offlineUrl)};
const SERVICE_WORKER_URL = ${JSON.stringify(serviceWorkerUrl)};
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};

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
    requestUrl.pathname.startsWith(\`\${BASE_PATH || ""}/_next/\`) ||
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
`;
}

export function generatePwaAssets() {
  const exportDirectory = path.join(process.cwd(), "out");

  if (!fs.existsSync(exportDirectory)) {
    throw new Error('Static export not found. Run "npm run build" first.');
  }

  const basePath = normalizeBasePath(process.env.PAGES_BASE_PATH ?? "");
  const precacheUrls = collectFiles(exportDirectory)
    .map((filePath) => toPrecacheUrl(filePath, exportDirectory, basePath))
    .filter((value) => value !== null)
    .sort();
  const cacheVersion = crypto
    .createHash("sha256")
    .update(precacheUrls.join("\n"))
    .digest("hex")
    .slice(0, 12);

  fs.writeFileSync(
    path.join(exportDirectory, "service-worker.js"),
    createServiceWorkerSource({
      basePath,
      cacheVersion,
      precacheUrls,
    }),
  );

  console.log(
    `Generated service worker with ${precacheUrls.length} precached assets.`,
  );
}
