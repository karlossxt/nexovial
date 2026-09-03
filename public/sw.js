/* NEXO Service Worker - precaching del shell + network-first para la app */
const CACHE_NAME = 'nexo-shell-v1';
const SHELL = ['/', '/index.html', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // No cachear llamadas dinámicas a la API del backend
  if (url.pathname.startsWith('/api/')) return;

  // Navegación: network-first con fallback al shell cacheado (offline básico)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Assets same-origin estáticos (css/js/imágenes/fuentes): stale-while-revalidate
  // NO se cachean recursos de terceros (tiles de mapa, etc.) para no saturar la cuota.
  if (req.method === 'GET' && url.origin === self.location.origin) {
    if (!/\.(png|jpe?g|gif|webp|svg|ico|css|js|woff2?|ttf|eot|json)$/.test(url.pathname)) return;
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }
});
