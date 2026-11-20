// Identifies the physical device. The fingerprint is built from traits that stay the same on one
// phone and differ between phones: screen size, graphics chip, operating system family, touch
// support and time zone. It deliberately ignores memory, storage and anything that changes with
// browser updates, zoom or how busy the phone is, so it does not flip between visits.
// Nothing here is stored in the browser, so copying browser data to another phone carries nothing over.

let cached = null;

const toHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

// SHA-256 where the browser allows it, otherwise a deterministic stand-in of the same length.
const digest = async (text) => {
    try {
        if (window.crypto && window.crypto.subtle) {
            return toHex(await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
        }
    } catch (e) { /* fall through */ }
    let out = '';
    for (let seed = 0; out.length < 64; seed++) {
        let h = 0x811c9dc5 ^ seed;
        for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
        out += h.toString(16).padStart(8, '0');
    }
    return out.slice(0, 64);
};

const gpuRenderer = () => {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'no-webgl';
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const raw = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        return String(raw || 'unknown').toLowerCase().replace(/\s+/g, ' ').trim();
    } catch (e) {
        return 'unknown';
    }
};

const osFamily = (ua) => {
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
    if (/windows/i.test(ua)) return 'windows';
    if (/macintosh|mac os x/i.test(ua)) return 'macos';
    if (/cros/i.test(ua)) return 'chromeos';
    if (/linux/i.test(ua)) return 'linux';
    return 'other';
};

const newDeviceId = () => {
    try { if (window.crypto && window.crypto.randomUUID) return `FXEC-${window.crypto.randomUUID()}`; } catch (e) { /* fall through */ }
    return `FXEC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
};

const friendlyName = (ua, os) => {
    if (os === 'android') {
        if (/samsung|sm-/i.test(ua)) return 'Samsung Galaxy phone';
        if (/redmi|xiaomi/i.test(ua)) return 'Xiaomi / Redmi phone';
        if (/oneplus/i.test(ua)) return 'OnePlus phone';
        if (/vivo/i.test(ua)) return 'Vivo phone';
        if (/oppo/i.test(ua)) return 'Oppo phone';
        return 'Android phone';
    }
    if (os === 'ios') return /ipad/i.test(ua) ? 'Apple iPad' : 'Apple iPhone';
    if (os === 'windows') return 'Windows computer';
    if (os === 'macos') return 'Mac';
    if (os === 'linux') return 'Linux computer';
    return 'This device';
};

export const getDeviceSecurityInfo = async () => {
    if (cached) return cached;

    // A random id kept in the browser. Used only to tell two browsers on the same phone apart in logs;
    // it is never what decides whether a device is the registered one.
    let deviceId = null;
    try { deviceId = localStorage.getItem('fxec_device_id'); } catch (e) { /* storage blocked */ }
    if (!deviceId) {
        deviceId = newDeviceId();
        try { localStorage.setItem('fxec_device_id', deviceId); } catch (e) { /* storage blocked */ }
    }

    const ua = navigator.userAgent || '';
    const os = osFamily(ua);
    const w = window.screen.width;
    const h = window.screen.height;

    const traits = {
        longSide: Math.max(w, h),
        shortSide: Math.min(w, h),       // same value in portrait and landscape
        colorDepth: window.screen.colorDepth || 24,
        os,
        mobile: navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean'
            ? navigator.userAgentData.mobile
            : /mobi|android|iphone|ipad/i.test(ua),
        touch: (navigator.maxTouchPoints || 0) > 0,
        gpu: gpuRenderer(),
        timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone) || ''
    };

    const fingerprint = `v2:${await digest(JSON.stringify([
        traits.longSide, traits.shortSide, traits.colorDepth, traits.os, traits.mobile, traits.touch, traits.gpu, traits.timezone
    ]))}`;

    cached = {
        deviceId,
        deviceName: friendlyName(ua, os),
        platform: os,
        screenResolution: `${w}x${h}`,
        fingerprint,
        traits,
        timestamp: new Date().toISOString()
    };
    return cached;
};
