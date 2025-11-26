// sw.js
const CACHE_NAME = 'medok-v3'; // ↑ нове ім'я кешу = примусове оновлення
const ASSETS_TO_CACHE = [
  // НЕ кладемо сюди HTML-сторінки!
  './styles.css',
  './app.js',
  './order.js',
  './assets/medok-wordmark.png',
  './assets/hero-acacia.webp'
];

// install: тільки статичні ассети (без HTML)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
});

// activate: почистити старі кеші
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())))
    ).then(() => self.clients.claim())
  );
});

// fetch: для HTML (navigate) — мережа спочатку; для інших — cache-first
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Усі переходи між сторінками
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html')) // offline-фолбек за бажанням
    );
    return;
  }

  // Для CSS/JS/зображень — спочатку кеш, потім мережа
  event.respondWith(
    caches.match(req).then(res => res || fetch(req))
  );
});
