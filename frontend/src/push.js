// Doorbell alerts in the browser: ask once, subscribe this device, and keep the server in sync.

export const pushSupported = () =>
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const urlBase64ToUint8Array = (base64) => {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

// 'unsupported' | 'blocked' | 'off' | 'on'
export const getPushState = async () => {
    if (!pushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'blocked';
    if (Notification.permission !== 'granted') return 'off';
    try {
        const reg = await navigator.serviceWorker.ready;
        return (await reg.pushManager.getSubscription()) ? 'on' : 'off';
    } catch (e) {
        return 'off';
    }
};

// Must be called from a tap or click: browsers refuse to show the permission prompt otherwise.
export const enablePush = async () => {
    if (!pushSupported()) throw new Error('This browser cannot show alerts. On an iPhone, add the app to the home screen first.');

    const keyRes = await fetch('/api/notifications/public-key');
    const key = await keyRes.json();
    if (!key.enabled || !key.publicKey) throw new Error('Alerts are not set up on the server yet.');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Alerts are blocked. Allow notifications for this site in the browser settings.');

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key.publicKey) });
    }
    const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() })
    });
    if (!res.ok) throw new Error('Could not save your alert settings. Try again.');
    return true;
};

export const disablePush = async () => {
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            await fetch('/api/notifications/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: sub.endpoint })
            });
            await sub.unsubscribe();
        }
    } catch (e) { /* nothing to remove */ }
};

// After sign in: if this device already allowed alerts, make sure the server knows about it
// under the account that just signed in (a shared phone may have had another user before).
export const resyncPush = async () => {
    try {
        if (!pushSupported() || Notification.permission !== 'granted') return;
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) return;
        // A subscription made with a different server key can never receive anything: renew it.
        try {
            const key = await (await fetch('/api/notifications/public-key')).json();
            const have = sub.options && sub.options.applicationServerKey
                ? btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
                : null;
            if (key.publicKey && have && have !== key.publicKey) {
                await sub.unsubscribe().catch(() => {});
                sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key.publicKey) });
            }
        } catch (e) { /* keep the current one */ }
        await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub.toJSON() })
        });
    } catch (e) { /* will retry next launch */ }
};

// Everything that has to be true for an alert to appear, read from this phone.
export const getDiagnostics = async () => {
    const d = {
        secure: window.isSecureContext,
        installed: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
        permission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
        swScript: null, swState: null, pushHost: null, serverDevices: null, lastPush: null
    };
    try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        d.swScript = reg && reg.active ? new URL(reg.active.scriptURL).pathname : null;
        d.swState = reg && reg.active ? reg.active.state : null;
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        d.pushHost = sub ? new URL(sub.endpoint).host : null;
    } catch (e) { /* leave as null */ }
    try {
        const res = await fetch('/api/notifications/status');
        if (res.ok) d.serverDevices = (await res.json()).devices;
    } catch (e) { /* offline */ }
    try {
        const cache = await caches.open('attendotp-diag');
        const hit = await cache.match('/__diag/last-push');
        d.lastPush = hit ? await hit.json() : null;
    } catch (e) { /* no record yet */ }
    return d;
};

// Shows a notification straight from this phone, with no server involved.
export const showLocalTest = async () => {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('Local test', {
        body: 'This phone can show notifications. If server alerts do not appear, the problem is delivery, not display.',
        icon: '/icon-192.png',
        tag: 'local-test'
    });
};

export const sendTestPush = async () => {
    const res = await fetch('/api/notifications/test', { method: 'POST' });
    return res.json();
};
