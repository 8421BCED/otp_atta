// FXEC Device Security and Anti-Proxy Binding Utility
export const getDeviceSecurityInfo = async () => {
    // 1. Persistent Unique Device ID (simulates hardware ID)
    let deviceId = localStorage.getItem('fxec_device_id');
    if (!deviceId) {
        const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
        const timePart = Date.now().toString(36).toUpperCase();
        deviceId = `FXEC-DEV-${timePart}-${randomPart}`;
        localStorage.setItem('fxec_device_id', deviceId);
    }

    // 2. Hardware Hash
    let hardwareHash = 'hw_standard';
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#0B3064';
            ctx.fillText('FXEC-SECURE-2026', 2, 2);
            ctx.fillStyle = '#FFB800';
            ctx.fillText('STUDENT_DEVICE_BINDING', 4, 20);
            const dataUrl = canvas.toDataURL();
            let hash = 0;
            for (let i = 0; i < dataUrl.length; i++) {
                hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
                hash |= 0;
            }
            hardwareHash = `HW_${Math.abs(hash).toString(16)}`;
        }
    } catch (e) {
        console.warn('Canvas hardware hash fallback:', e);
    }

    // 3. Detect Device Model / Platform
    const ua = navigator.userAgent;
    let platform = 'Standard OS';
    let deviceName = 'Personal Computer / Browser';

    if (/android/i.test(ua)) {
        platform = 'Android';
        if (/samsung/i.test(ua) || /sm-/i.test(ua)) {
            deviceName = 'Samsung Galaxy Mobile';
        } else if (/redmi|xiaomi/i.test(ua)) {
            deviceName = 'Xiaomi / Redmi Mobile';
        } else if (/oneplus/i.test(ua)) {
            deviceName = 'OnePlus Mobile';
        } else if (/vivo/i.test(ua)) {
            deviceName = 'Vivo Smartphone';
        } else if (/oppo/i.test(ua)) {
            deviceName = 'Oppo Smartphone';
        } else {
            deviceName = 'Android Smartphone';
        }
    } else if (/iphone|ipad|ipod/i.test(ua)) {
        platform = 'iOS';
        deviceName = /ipad/i.test(ua) ? 'Apple iPad' : 'Apple iPhone';
    } else if (/windows/i.test(ua)) {
        platform = 'Windows';
        deviceName = 'Windows Workstation / Laptop';
    } else if (/macintosh|mac os x/i.test(ua)) {
        platform = 'macOS';
        deviceName = 'Apple MacBook / Mac';
    } else if (/linux/i.test(ua)) {
        platform = 'Linux';
        deviceName = 'Linux Workstation';
    }

    const screenRes = `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio || 1}x)`;

    return {
        deviceId,
        deviceName,
        platform,
        screenResolution: screenRes,
        fingerprint: `${hardwareHash}-${platform}-${screenRes}-${navigator.hardwareConcurrency || 4}`,
        timestamp: new Date().toISOString()
    };
};
