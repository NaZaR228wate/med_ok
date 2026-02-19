// sw.js
const CACHE_NAME = 'medok-v10';
const ASSETS_TO_CACHE = [
  './styles.css',
  './app.js',
  './order.js',
  './assets/medok-wordmark.png',
  './assets/hero-acacia.webp'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // переходи між сторінками — мережа спочатку; офлайн-фолбек за бажанням
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // статичні — cache first
  event.respondWith(
    caches.match(req).then(res => res || fetch(req))
  );
});
