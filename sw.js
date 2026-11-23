const CACHE = "nexus-ai-v7";
const SHELL = ["./", "./index.html", "./app.js", "./comptes.js", "./nexus-corps.mjs", "./nexus-tools.js", "./manifest.json", "./logo.png", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => {
  // un fichier manquant (ex. une icône) ne doit pas bloquer les autres
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  // Jamais d'interception des appels vers les IA / API : seulement les fichiers de l'app
  if (r.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(
    fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r).then((m) => m || caches.match("./index.html")))
  );
});
