// NEXUS AI - service worker (fusion)
// Stratégie : on va chercher la page sur Internet en premier (mises à jour immédiates),
// et on retombe sur le cache hors connexion. Les appels aux IA et les téléchargements
// de modèles (autres sites) ne sont jamais interceptés.
const C = 'nexus-ai-v6';
const S = ['./', './index.html', './manifest.json', './nexus-brain.js', './logo.png', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => Promise.all(S.map(u => c.add(u).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r, { cache: 'no-cache' })
      .then(x => { if (x.ok) { const y = x.clone(); caches.open(C).then(c => c.put(r, y)); } return x; })
      .catch(() => caches.match(r).then(m => m || caches.match('./index.html')))
  );
});
