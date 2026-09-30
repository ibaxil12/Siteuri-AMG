const CACHE="amg-v4";
const SHELL=["./","index.html","style.css?v=4","app.js?v=4","manifest.webmanifest","icon-192.png","icon-512.png"];

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

  if (url.pathname.endsWith("/data.json") || url.pathname.endsWith("/data.json.gz") || url.pathname.endsWith("/manual.json")) {
    event.respondWith(fetch(request, {cache: "no-cache"}));
    return;
  }

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

  event.respondWith(fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
    }
    return response;
  }).catch(() => caches.match(request)));
});
