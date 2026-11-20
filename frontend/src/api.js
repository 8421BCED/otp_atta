// Every call to /api gets the signed-in user's token automatically, and an expired
// session signs the user out instead of leaving the screen half broken.
const SESSION_EXPIRED = 'fxec:session-expired';

const isApiUrl = (url) => typeof url === 'string' && (url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`));
const isAuthAttempt = (url) => /\/api\/(auth\/(login|google)|it-ops)/.test(url);

const readToken = () => {
    try { return localStorage.getItem('fxec_token'); } catch (e) { return null; }
};

export const installApiClient = () => {
    if (window.__apiClientInstalled) return;
    window.__apiClientInstalled = true;
    const nativeFetch = window.fetch.bind(window);

    window.fetch = async (input, init = {}) => {
        const url = typeof input === 'string' ? input : input?.url;
        if (!isApiUrl(url)) return nativeFetch(input, init);

        const headers = new Headers(init.headers || {});
        const token = readToken();
        if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

        const res = await nativeFetch(input, { ...init, headers });
        if (res.status === 401 && token && !isAuthAttempt(url)) {
            window.dispatchEvent(new Event(SESSION_EXPIRED));
        }
        // The server asked us to slow down: pause background polling for as long as it says.
        if (res.status === 429 || res.status === 503) {
            const wait = parseInt(res.headers.get('Retry-After') || '', 10);
            window.__fxecBackoffUntil = Date.now() + (Number.isFinite(wait) ? Math.min(wait, 120) : 15) * 1000;
        }
        return res;
    };
};

export const isBackingOff = () => (window.__fxecBackoffUntil || 0) > Date.now();

export const onSessionExpired = (handler) => {
    window.addEventListener(SESSION_EXPIRED, handler);
    return () => window.removeEventListener(SESSION_EXPIRED, handler);
};
