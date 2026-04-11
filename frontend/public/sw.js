/* Basic service worker for offline support and static asset caching */
const CACHE_NAME = "portfolio-static-v1";
const CORE_ASSETS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Never cache API requests, but report network failure back to clients.
  if (url.pathname.startsWith("/chat") || url.pathname.startsWith("/suggestions") || url.pathname.startsWith("/rag")) {
    event.respondWith(
      fetch(request).catch(async (error) => {
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        clients.forEach((client) => {
          client.postMessage({ type: "API_UNREACHABLE", path: url.pathname });
        });
        throw error;
      })
    );
    return;
  }

  // Cache-first for same-origin static assets.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
            return networkResponse;
          })
          .catch(() => caches.match("/index.html"));
      })
    );
  }
});
