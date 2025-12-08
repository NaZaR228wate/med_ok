// sw.js
const CACHE_NAME = 'medok-v4'; // змінив версію кешу, щоб усі отримали новий SW
const ASSETS_TO_CACHE = [
  // HTML не кешуємо тут
  './styles.css',
  './app.js',
  './order.js',
  './assets/medok-wordmark.png',
  './assets/hero-acacia.webp'
];

// install: кешуємо тільки статику
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// activate: чистимо старі кеші
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())))
    ).then(() => self.clients.claim())
  );
});

// fetch:
// 1) НЕ перехоплюємо навігацію (req.mode === 'navigate') — даємо браузеру самостійно перейти.
// 2) НЕ чіпаємо безпосередньо /thank-you.html навіть якщо це не navigate (на всяк випадок).
// 3) Для CSS/JS/картинок — cache-first.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Повністю відпускаємо всі переходи між сторінками
  if (req.mode === 'navigate' || url.pathname === '/thank-you.html') {
    return; // не викликаємо respondWith → SW не перешкоджає навігації
  }

  // Статика: спочатку кеш, потім мережа
  event.respondWith(
    caches.match(req).then(res => res || fetch(req))
  );
});