// No private page, API, auth token or business data is cached offline.
const CACHE="import-afrique-shell-v1";
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(["/offline.html","/app-icon-192.png","/app-icon-512.png"])));self.skipWaiting();});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{const url=new URL(event.request.url);if(url.origin!==self.location.origin||event.request.method!=="GET")return;if(event.request.mode==="navigate"&&url.pathname.startsWith("/app")){event.respondWith(fetch(event.request).catch(()=>caches.match("/offline.html")));}});
