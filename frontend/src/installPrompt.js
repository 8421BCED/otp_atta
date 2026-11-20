// Chrome fires "beforeinstallprompt" once, early. This module catches it at start-up and keeps it,
// so any screen (login banner, account menu) can offer the install later without missing it.

let deferred = null;
let installed = false;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export const isStandalone = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

export const initInstallPrompt = () => {
    if (typeof window === 'undefined' || window.__installPromptReady) return;
    window.__installPromptReady = true;
    installed = isStandalone();

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferred = e;
        notify();
    });
    window.addEventListener('appinstalled', () => {
        installed = true;
        deferred = null;
        notify();
    });
};

export const canInstall = () => !installed && !!deferred;
export const isInstalled = () => installed;
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

// Shows Chrome's own install dialog. Returns 'accepted' | 'dismissed' | 'unavailable'.
export const promptInstall = async () => {
    if (!deferred) return 'unavailable';
    const e = deferred;
    deferred = null;
    notify();
    e.prompt();
    const { outcome } = await e.userChoice;
    return outcome;
};

export const subscribeInstall = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};
