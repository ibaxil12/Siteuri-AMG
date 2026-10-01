const CACHE="campusmed-v35";
const SHELL=[
  "./","index.html","anunturi.html","cautare.html","documente.html","utile.html","linkuri.html","feedback.html","admin-feedback.html","updates.html","calendar.html","faq.html","anul1.html",
  "style.css?v=29","app.js?v=23","supabase-config.js?v=1","feedback-db.js?v=2","admin-feedback.js?v=4","updates.js?v=2",
  "manifest.webmanifest","icon-192.png","icon-512.png"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch",event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=="GET"||url.origin!==self.location.origin)return;

  const freshData=url.pathname.endsWith("/data.json")||url.pathname.endsWith("/data.json.gz")||url.pathname.endsWith("/manual.json");
  if(freshData){
    event.respondWith(fetch(request,{cache:"no-store"}).catch(()=>caches.match(request)));
    return;
  }

  if(request.mode==="navigate"){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));
      return response;
    }).catch(()=>caches.match(request).then(cached=>cached||caches.match("index.html"))));
    return;
  }

  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));
    return response;
  })));
});