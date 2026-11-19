const CACHE_NAME = 'nexus-ai-v1';
const APP_SHELL = ['./','./index.html','./manifest.json'];

self.addEventListener('install',(event)=>{
  event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate',(event)=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch',(event)=>{
  const { request } = event;
  if(request.method!=='GET') return;
  const url = new URL(request.url);

  // Ne jamais cacher les appels API
  if(
    url.hostname.includes('api.') ||
    url.hostname.includes('generativelanguage') ||
    url.hostname.includes('openrouter') ||
    url.hostname.includes('groq') ||
    url.hostname.includes('pollinations') ||
    url.hostname.includes('puter') ||
    url.hostname.includes('kilocode')
  ) return;

  // Cache-first pour l'app shell
  if(APP_SHELL.some(p=>url.pathname.endsWith(p) || url.pathname==='/')){
    event.respondWith(
      caches.match(request).then(cached=>cached || fetch(request).then(res=>{
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c=>c.put(request,clone));
        return res;
      }).catch(()=>caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    fetch(request).then(res=>{
      if(res.ok && url.origin===location.origin){
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c=>c.put(request,clone));
      }
      return res;
    }).catch(()=>caches.match(request))
  );
});
