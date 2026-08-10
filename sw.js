const CACHE_NAME = 'libertas-jyotish-v10';
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

self.addEventListener('install', (e) => {
self.skipWaiting();
e.waitUntil(
caches.open(CACHE_NAME).then((cache) => {
console.log('[Service Worker] Caching all assets (v10)');
return cache.addAll(ASSETS_TO_CACHE);
})
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
