import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { canInstall, isInstalled, isIos, promptInstall, subscribeInstall } from '../installPrompt';

// Shared state, so the banner and the account menu button always agree.
export const useInstallState = () => {
    const [, tick] = useState(0);
    useEffect(() => subscribeInstall(() => tick((n) => n + 1)), []);
    return { available: canInstall(), installed: isInstalled(), ios: isIos() };
};

export const PWAInstallPrompt = () => {
    const { available, installed, ios } = useInstallState();
    const [dismissed, setDismissed] = useState(() => {
        try { return sessionStorage.getItem('pwa_prompt_dismissed') === 'true'; } catch (e) { return false; }
    });
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    // Stop pinch-zoom so the app feels native.
    useEffect(() => {
        const onTouchMove = (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); };
        const onGesture = (e) => e.preventDefault();
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('gesturestart', onGesture, { passive: false });
        return () => {
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('gesturestart', onGesture);
        };
    }, []);

    const dismiss = () => {
        setDismissed(true);
        try { sessionStorage.setItem('pwa_prompt_dismissed', 'true'); } catch (e) { /* ignore */ }
    };

    const install = async () => {
        if (ios) { setShowIOSGuide(true); return; }
        await promptInstall();
    };

    if (installed || dismissed || !(available || ios)) return null;

    return (
        <>
            <div className="pwa-banner ui-card ui-card--sm" role="complementary" aria-label="Install app">
                <img src="/icon-192.png" alt="" className="pwa-icon" />
                <div className="u-grow">
                    <div className="pwa-title">Install AttendOTP</div>
                    <div className="pwa-sub">Opens like an app and sends attendance alerts</div>
                </div>
                <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={install}>
                    <Download size={15} />
                    Install
                </button>
                <button type="button" className="ui-icon-btn" style={{ width: 34, height: 34, borderRadius: 11 }} onClick={dismiss} aria-label="Dismiss">
                    <X size={16} />
                </button>
            </div>

            {showIOSGuide && (
                <div className="ui-modal-backdrop" onClick={() => setShowIOSGuide(false)}>
                    <div className="ui-modal" style={{ maxWidth: 380, padding: 26 }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: 6 }}>Install on iPhone</h3>
                        <p className="u-muted" style={{ marginBottom: 14 }}>Add AttendOTP to your home screen. Alerts only work once it is installed.</p>
                        <ol style={{ paddingLeft: 20, lineHeight: 1.9, marginBottom: 20 }}>
                            <li>Open this page in <strong>Safari</strong> and tap <strong>Share</strong>.</li>
                            <li>Choose <strong>Add to Home Screen</strong>.</li>
                            <li>Tap <strong>Add</strong>, then open AttendOTP from your home screen.</li>
                        </ol>
                        <button type="button" className="ui-btn ui-btn--primary ui-btn--block" onClick={() => setShowIOSGuide(false)}>Done</button>
                    </div>
                </div>
            )}
        </>
    );
};
