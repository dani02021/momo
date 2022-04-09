let contentToCache = [
    '/',
    'index.html',
    'manifest.json',
    'sw.js',
    'images/android/android-launchericon-48-48.png',
    'images/android/android-launchericon-72-72.png',
    'images/android/android-launchericon-96-96.png',
    'images/android/android-launchericon-144-144.png',
    'images/android/android-launchericon-192-192.png',
    'images/android/android-launchericon-512-512.png'
];

self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
    e.waitUntil((async () => {
        const cache = await caches.open("myCoolCache");
        console.log('[Service Worker] Caching all: app shell and content');
        await cache.addAll(contentToCache);
    })());
});

self.addEventListener('fetch', (e) => {
    e.respondWith((async () => {
        const r = await caches.match(e.request);
        console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
        if (r) { return r; }
        const response = await fetch(e.request);
        const cache = await caches.open("myCoolCache");
        console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
        cache.put(e.request, response.clone());
        return response;
    })());
});