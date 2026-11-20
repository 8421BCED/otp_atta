// AttendOTP service worker.
//   1. Offline shell: the app opens with no signal and says so, instead of a browser error page.
//   2. Doorbell: push notifications that arrive even when the app is closed.
// API calls are never cached. Attendance must always come from the server.

const VERSION = 'v8';
const SHELL_CACHE = `attendotp-shell-${VERSION}`;
const ASSET_CACHE = `attendotp-assets-${VERSION}`;
const DIAG_CACHE = 'attendotp-diag'; // survives updates: holds the last push record
const SHELL_URLS = ['/', '/manifest.json', '/favicon.svg', '/brand_logo.png', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then((cache) => cache.addAll(SHELL_URLS))
            .catch(() => { /* a missing file must not block the install */ })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE && k !== DIAG_CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return; // always live

    // Opening the app: try the network, fall back to the saved shell.
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(SHELL_CACHE).then((c) => c.put('/', copy)).catch(() => {});
                    return res;
                })
                .catch(() => caches.match('/').then((r) => r || Response.error()))
        );
        return;
    }

    // Built files have a hash in their name, so a saved copy is always the right one.
    if (url.pathname.startsWith('/assets/')) {
        event.respondWith(
            caches.match(req).then((hit) => hit || fetch(req).then((res) => {
                if (res.ok) { const copy = res.clone(); caches.open(ASSET_CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
                return res;
            }))
        );
        return;
    }

    // Logo and icons: show the saved copy, refresh it in the background.
    if (SHELL_URLS.includes(url.pathname)) {
        event.respondWith(
            caches.match(req).then((hit) => {
                const refresh = fetch(req).then((res) => {
                    if (res.ok) { const copy = res.clone(); caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
                    return res;
                }).catch(() => hit);
                return hit || refresh;
            })
        );
    }
});

// ---------------------------------------------------------------- doorbell
// Remember what happened, so the app can show "last alert received" and why one did not appear.
const recordPush = async (info) => {
    try {
        const cache = await caches.open(DIAG_CACHE);
        await cache.put('/__diag/last-push', new Response(JSON.stringify(info), { headers: { 'Content-Type': 'application/json' } }));
    } catch (e) { /* diagnostics are best effort */ }
};

self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : '' }; }

    const title = data.title || 'AttendOTP';
    const body = data.body || 'Attendance is open. Enter the code now.';
    const full = {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || 'attendotp',
        renotify: true,
        requireInteraction: data.tag === 'attendance-open' || data.tag === 'attendance-reminder',
        vibrate: [200, 100, 200, 100, 300],
        timestamp: Date.now(),
        data: { url: data.url || '/' }
    };

    // Tell the server this device really showed the message. If no receipt arrives the server
    // sends it once more, which is what rescues a phone that was napping when the first one came.
    const confirm = async () => {
        if (!data.id) return;
        try {
            const sub = await self.registration.pushManager.getSubscription();
            if (!sub) return;
            await fetch('/api/notifications/ack', {
                method: 'POST', keepalive: true,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: data.id, endpoint: sub.endpoint })
            });
        } catch (e) { /* the server may send once more; harmless */ }
    };
    // A message sent twice (the retry) must not ring twice: same tag replaces, and renotify is off for it.
    if (data.retry) full.renotify = false;

    event.waitUntil((async () => {
        const info = { at: new Date().toISOString(), title, shown: false };
        try {
            await self.registration.showNotification(title, full);
            info.shown = true;
            await confirm();
        } catch (e) {
            // Some phones reject an option. Fall back to the plainest notification so something always appears.
            info.error = String(e && e.message ? e.message : e);
            try {
                await self.registration.showNotification(title, { body, tag: full.tag, data: full.data });
                info.shown = true;
                info.fallback = true;
                await confirm();
            } catch (e2) {
                info.error += ' | ' + String(e2 && e2.message ? e2.message : e2);
            }
        }
        await recordPush(info);
    })());
});

// The browser rotated this device's push subscription while the app was closed.
// Subscribe again and tell the server, so alerts keep arriving without anyone opening the app.
self.addEventListener('pushsubscriptionchange', (event) => {
    event.waitUntil((async () => {
        try {
            const oldSub = event.oldSubscription;
            let newSub = event.newSubscription;
            if (!newSub) {
                const res = await fetch('/api/notifications/public-key');
                const { publicKey } = await res.json();
                if (!publicKey) return;
                const pad = '='.repeat((4 - (publicKey.length % 4)) % 4);
                const raw = atob((publicKey + pad).replace(/-/g, '+').replace(/_/g, '/'));
                const key = Uint8Array.from(raw, (c) => c.charCodeAt(0));
                newSub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: (oldSub && oldSub.options && oldSub.options.applicationServerKey) || key });
            }
            if (oldSub && oldSub.endpoint) {
                await fetch('/api/notifications/resubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ oldEndpoint: oldSub.endpoint, subscription: newSub.toJSON() })
                });
            }
        } catch (e) { /* the next time the app opens it will sync again */ }
    })());
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
            for (const w of windows) {
                if (new URL(w.url).origin === self.location.origin && 'focus' in w) {
                    if ('navigate' in w) w.navigate(target).catch(() => {});
                    return w.focus();
                }
            }
            return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
        })
    );
});

