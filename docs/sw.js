const CACHE="campusmed-v39";
const SHELL=[
  "./","index.html","anunturi.html","cautare.html","documente.html","utile.html","linkuri.html","feedback.html","admin-feedback.html","updates.html","calendar.html","faq.html","anul1.html",
  "style.css?v=33","app.js?v=25","supabase-config.js?v=1","feedback-db.js?v=3","admin-feedback.js?v=6","updates.js?v=3",
  "manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(SHELL.map(url=>cache.add(url)))));
  self.skipWaiting();
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=="GET"||url.origin!==self.location.origin)return;

  const freshData=/\/(data\.json(?:\.gz)?|manual\.json)$/.test(url.pathname);
  if(freshData){
    const cacheKey=new Request(url.origin+url.pathname);
    event.respondWith(fetch(request,{cache:"no-store"}).then(response=>{
      if(response.ok)caches.open(CACHE).then(cache=>cache.put(cacheKey,response.clone()));
      return response;
    }).catch(()=>caches.match(cacheKey).then(cached=>cached||Response.error())));
    return;
  }

  if(request.mode==="navigate"){
    event.respondWith(fetch(request,{cache:"no-cache"}).then(response=>{
      if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));
      return response;
    }).catch(()=>caches.match(request).then(cached=>cached||caches.match("index.html"))));
    return;
  }

  event.respondWith(caches.match(request).then(cached=>{
    const network=fetch(request).then(response=>{
      if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));
      return response;
    }).catch(()=>cached);
    if(cached){event.waitUntil(network);return cached}
    return network;
  }));
});
