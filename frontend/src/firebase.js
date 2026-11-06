// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// Your web app's Firebase configuration from plans/fcm.txt
const firebaseConfig = {
  apiKey: "AIzaSyCfd67sNF7rzkxYCpbR1aWukO96mNqACAQ",
  authDomain: "otpatt-da2b6.firebaseapp.com",
  projectId: "otpatt-da2b6",
  storageBucket: "otpatt-da2b6.firebasestorage.app",
  messagingSenderId: "22236732690",
  appId: "1:22236732690:web:606c3fd79370ed3eb5a7cb",
  measurementId: "G-JZXNDZQK2X"
};

const app = initializeApp(firebaseConfig);

/**
 * Request notification permission and register FCM Token with backend
 * @param {Object} currentUser
 * @param {string} vapidKey - Firebase Web Push Certificate Key
 */
export const requestFcmPermissionAndToken = async (currentUser, vapidKey = null) => {
    try {
        const supported = await isSupported();
        if (!supported) {
            console.log("FCM Messaging is not supported on this browser.");
            return null;
        }

        if (typeof Notification === 'undefined') {
            console.log("HTML5 Notifications not supported.");
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log("Notification permission not granted:", permission);
            return null;
        }

        // Explicitly register background service worker with scope /
        let swRegistration = null;
        if ('serviceWorker' in navigator) {
            swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
            await navigator.serviceWorker.ready;
            console.log("✓ Doorbell Push Service Worker registered:", swRegistration.scope);
        } else {
            console.warn("Service Workers not supported in this browser environment.");
            return null;
        }

        const messaging = getMessaging(app);

        const tokenOptions = {
            serviceWorkerRegistration: swRegistration
        };
        if (vapidKey) {
            tokenOptions.vapidKey = vapidKey;
        }

        const fcmToken = await getToken(messaging, tokenOptions);
        if (fcmToken) {
            // Save token to backend database
            await fetch('/api/notifications/register-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: fcmToken,
                    userId: currentUser?.id || null,
                    role: currentUser?.role || null,
                    department: currentUser?.department || null,
                    deviceInfo: navigator.userAgent
                })
            });
            console.log("FCM Token synced with server:", fcmToken.slice(0, 15) + "...");
            return fcmToken;
        }
    } catch (err) {
        console.warn("FCM Token error (VAPID key may need to be generated in Firebase Console):", err);
        return null;
    }
};

/**
 * Foreground message handler
 */
export const onForegroundMessage = (callback) => {
    isSupported().then(supported => {
        if (!supported) return;
        const messaging = getMessaging(app);
        onMessage(messaging, (payload) => {
            console.log("Foreground Push Received:", payload);
            if (callback) callback(payload);
        });
    });
};

