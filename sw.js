/* VNTV — lucru offline (doar pentru varianta găzduită).
   Aplicația (index.html, manifest, pictograme) se păstrează local; catalogul se reîmprospătează în fundal;
   videourile și API-urile PeerTube merg mereu direct la rețea, nu se stochează. */
const CACHE = "vntv-2.5.6";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png", "icons/favicon-64.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("vntv-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // aplicația: întâi din memoria locală, apoi rețeaua
  if (url.origin === location.origin){
    e.respondWith(caches.match(req, {ignoreSearch: req.mode === "navigate"}).then(r => r || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match("index.html"))));
    return;
  }
  // catalogul VideoNeat: întâi rețeaua (ca toți spectatorii să aibă același program), copia locală doar fără rețea
  if (/\/videoneat\/v1\/index|videoneat-index\.json/.test(url.pathname)){
    e.respondWith(caches.open(CACHE).then(async c => {
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; });
      const timeout = new Promise(r => setTimeout(r, 4000));
      try{ const res = await Promise.race([net, timeout]); if (res) return res; }catch(err){}
      return (await c.match(req)) || net;
    }));
  }
});
