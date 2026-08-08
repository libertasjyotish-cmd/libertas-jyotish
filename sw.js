const CACHE_NAME = 'libertas-jyotish-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './img/bg-jyotish.jpg',
  './img/libertas-logo.png'
];

// インストール処理（キャッシュ登録）
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 有効化処理（古いキャッシュ削除）
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
    })
  );
  self.clients.claim();
});

// フェッチ処理（キャッシュから応答、なければネットワークへ）
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
