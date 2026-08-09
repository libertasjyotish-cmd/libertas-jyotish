const CACHE_NAME = 'libertas-jyotish-v2'; // バージョンを上げて古いキャッシュを破棄
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './mypage.html',
  './result.html',
  './legal.html',
  './manifest.json',
  './img/bg-jyotish.jpg',
  './img/libertas-logo.png'
];

// インストール処理（即時待機解除＆キャッシュ登録）
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 有効化処理（古いバージョンのキャッシュ削除＆全クライアント即時制御）
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

// フェッチ処理（ネットワーク優先：最新データを取得し、通信エラー時のみキャッシュを使用）
self.addEventListener('fetch', (e) => {
  // POST等のデータ送信処理（Make通信等）はキャッシュ処理から除外
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // ネットワークから正常に取得できた場合は最新ファイルをキャッシュにも上書き保存
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // オフライン時など通信失敗時のみ、保存されているキャッシュを返す
        return caches.match(e.request);
      })
  );
});
