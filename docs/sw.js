const CACHE="amg-v2";
const SHELL=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin) return;

  // Data changes daily: always request the current copy instead of serving a stale cached copy.
  if (url.pathname.endsWith("/data.json") || url.pathname.endsWith("/data.json.gz") || url.pathname.endsWith("/manual.json")) {
    event.respondWith(fetch(request, {cache: "no-cache"}));
    return;
  }

  // HTML is network-first so new deployments become visible immediately.
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request).then(cached => cached || caches.match("index.html"))));
    return;
  }

  // Static assets are cached after successful requests and available offline.
  event.respondWith(fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
    }
    return response;
  }).catch(() => caches.match(request)));
});
