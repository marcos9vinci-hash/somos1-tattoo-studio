// Service Worker oficial do Somos 1 Tattoo Studio PWA
const CACHE_NAME = 'somos1-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Evento fetch obrigatório para os navegadores reconhecerem e autorizarem a instalação do PWA
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Para navegacao HTML ou recursos do proprio app, tenta a rede e fallback no cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
