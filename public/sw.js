// Service Worker oficial v6 do Somos 1 Tattoo Studio PWA
const CACHE_NAME = 'somos1-cache-v6';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

// Network-first com fallback seguro
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response('Sem conexão', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

// Manipulador de clique na notificação flutuante do celular (heads-up / banner com botões)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action; // 'sim', 'nao' ou vazio (clique no corpo)

  let targetUrl = data.url || '/admin';
  if (action && data.bookingId) {
    targetUrl = `${targetUrl}?confirmarPresencaId=${encodeURIComponent(data.bookingId)}&status=${encodeURIComponent(action)}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          // Se já tem aba aberta, despacha postMessage com a ação para processar imediatamente
          if (action && data.bookingId) {
            client.postMessage({
              type: 'CONFIRMAR_PRESENCA_NOTIFICACAO',
              bookingId: data.bookingId,
              compareceu: action === 'sim'
            });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});


