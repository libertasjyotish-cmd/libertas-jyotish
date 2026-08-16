const CACHE_NAME = 'libertas-jyotish-v36';
// vercel.json の cleanUrls: true に合わせ、リダイレクトされない実体パスを指定する
const ASSETS_TO_CACHE = [
  '/ja',
  '/ja/mypage',
  '/ja/result',
  '/ja/legal',
  '/css/site-menu.css',
  '/css/parchment.css',
  '/css/rtl.css',
  '/js/site-menu.js',
  '/manifest.json',
  '/img/bg-jyotish.jpg',
  '/img/libertas-logo.png',
  '/img/mandala-zodiac.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    // 個別に追加し、1 件でも失敗したら install ごと失敗する addAll の挙動を回避する
    caches.open(CACHE_NAME).then((cache) => Promise.all(
      ASSETS_TO_CACHE.map((url) => cache.add(url).catch((err) => {
        console.warn('[Service Worker] Failed to cache', url, err);
      }))
    ))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const userAgent = e.request.headers.get('User-Agent') || '';
  if (e.request.method !== 'GET' || userAgent.includes('Googlebot')) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
