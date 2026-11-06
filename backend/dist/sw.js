// Service Worker Cache Invalidation - Force latest code delivery
const CACHE_NAME = 'attend-otp-v3';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Always fetch directly from network to prevent caching old or broken JS bundles on mobile
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
