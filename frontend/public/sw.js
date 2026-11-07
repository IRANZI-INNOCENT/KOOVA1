/* KCOVA PWA.
   Navigations and app data are network-first.
   Hashed build files are cache-first.
   API calls are never cached. */

const CACHE_VERSION = "kova-pwa-v3";
const PRECACHE_URLS = ["/", "/login", "/workspace", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      await Promise.all(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined)),
      );
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isApiRequest(url) {
  return url.pathname.includes("/api/") || url.hostname.includes("api-");
}

function isAppData(request, url) {
  if (isApiRequest(url)) return true;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return true;
  if (url.pathname.startsWith("/_next/data/")) return true;
  if (url.searchParams.has("_rsc")) return true;
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/x-component")) return true;
  if (request.headers.get("RSC") === "1") return true;
  if (request.headers.get("Next-Router-Prefetch")) return true;
  return false;
}

function canStore(response) {
  return Boolean(
    response && response.ok && response.type === "basic" && !response.redirected,
  );
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (canStore(response)) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offline = await caches.match("/offline");
      if (offline) return offline;
    }
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (canStore(response)) {
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (isAppData(event.request, url)) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});
