const CACHE_NAME = 'nexus-ai-v5';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './nexus-brain.js',
  './nexus-tools.js',
  './logo.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Ne JAMAIS mettre en cache les appels API (IA, météo, wikipédia, etc.)
  if (
    url.hostname.includes('api.') ||
    url.hostname.includes('generativelanguage') ||
    url.hostname.includes('openrouter') ||
    url.hostname.includes('groq') ||
    url.hostname.includes('pollinations') ||
    url.hostname.includes('puter') ||
    url.hostname.includes('workers.dev') ||
    url.hostname.includes('cohere') ||
    url.hostname.includes('sambanova') ||
    url.hostname.includes('nvidia') ||
    url.hostname.includes('ollama') ||
    url.hostname.includes('deepseek') ||
    url.hostname.includes('mistral') ||
    url.hostname.includes('kilocode') ||
    url.hostname.includes('open-meteo') ||
    url.hostname.includes('wikipedia') ||
    url.hostname.includes('huggingface') ||
    url.hostname.includes('jsdelivr') ||
    url.hostname.includes('esm.run')
  ) {
    return;
  }

  // 2. Stratégie "Cache d'abord" pour l'application (HTML, JS, Images)
  if (APP_SHELL.some((p) => url.pathname.endsWith(p) || url.pathname === '/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // 3. Stratégie "Réseau d'abord" pour le reste
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && url.origin === location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
