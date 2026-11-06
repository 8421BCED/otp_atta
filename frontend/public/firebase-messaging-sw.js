// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
  apiKey: "AIzaSyCfd67sNF7rzkxYCpbR1aWukO96mNqACAQ",
  authDomain: "otpatt-da2b6.firebaseapp.com",
  projectId: "otpatt-da2b6",
  storageBucket: "otpatt-da2b6.firebasestorage.app",
  messagingSenderId: "22236732690",
  appId: "1:22236732690:web:606c3fd79370ed3eb5a7cb"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

/**
 * FCM "Doorbell Concept" Background Message Handler
 * When the app is closed, killed, or in sleep mode, FCM delivers high-priority background payloads.
 * This wakes up the service worker and immediately rings the user's device screen.
 */
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background Doorbell push received while app closed:', payload);
    
    const notificationTitle = payload.notification?.title || payload.data?.title || 'AttendOTP Doorbell Alert';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'Period attendance session is active! Tap to verify your OTP.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200, 100, 300], // Doorbell rhythm vibration
        requireInteraction: true, // Stays visible until student acts
        tag: payload.data?.tag || 'attend-otp-doorbell',
        renotify: true,
        data: {
            url: payload.data?.url || '/',
            time: new Date().toISOString()
        }
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// W3C Standard Native Push Event (Low-level OS event for closed PWA / background thread)
self.addEventListener('push', (event) => {
    let payload = {};
    try {
        if (event.data) {
            payload = event.data.json();
        }
    } catch (e) {
        payload = { data: { body: event.data ? event.data.text() : '' } };
    }

    const title = payload.notification?.title || payload.data?.title || 'AttendOTP Doorbell Alert';
    const options = {
        body: payload.notification?.body || payload.data?.body || 'Live period attendance session active! Enter your OTP code now.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200, 100, 300],
        requireInteraction: true,
        tag: payload.data?.tag || 'attend-otp-doorbell',
        renotify: true,
        data: {
            url: payload.data?.url || '/',
            time: new Date().toISOString()
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Direct Service Worker Message Event (For instant device test trigger from UI)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_DOORBELL') {
        const notificationTitle = event.data.title || 'AttendOTP Doorbell Alert';
        const notificationOptions = {
            body: event.data.body || 'Period attendance is active! Tap to verify your 6-digit rolling OTP.',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [200, 100, 200, 100, 300],
            requireInteraction: true,
            tag: 'attend-otp-doorbell',
            renotify: true,
            data: {
                url: event.data.url || '/',
                time: new Date().toISOString()
            }
        };
        event.waitUntil(self.registration.showNotification(notificationTitle, notificationOptions));
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let client of windowClients) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
