import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, Check } from 'lucide-react';

export const PWAInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isDismissed, setIsDismissed] = useState(() => {
        return sessionStorage.getItem('pwa_prompt_dismissed') === 'true';
    });
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    useEffect(() => {
        // Check if already in standalone display mode (PWA installed)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                             window.navigator.standalone || 
                             document.referrer.includes('android-app://');
        if (isStandalone) {
            setIsInstalled(true);
            return;
        }

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIPhoneOrIPad = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
        if (isIPhoneOrIPad) {
            setIsIOS(true);
            setIsInstallable(true);
        }

        // Listen for beforeinstallprompt event (Android Chrome / Edge / Desktop Chrome)
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // Also prevent pinch-to-zoom gestures in Safari and mobile webviews
        const handleTouchMove = (e) => {
            if (e.touches && e.touches.length > 1) {
                e.preventDefault();
            }
        };
        const handleGestureStart = (e) => {
            e.preventDefault();
        };

        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('gesturestart', handleGestureStart, { passive: false });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('gesturestart', handleGestureStart);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSGuide(true);
            return;
        }

        if (!deferredPrompt) {
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
            setIsInstallable(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setIsDismissed(true);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (isInstalled || isDismissed || !isInstallable) {
        return null;
    }

    return (
        <>
            {/* Floating Sleek Inbuilt PWA Install Banner */}
            <div className="pwa-install-banner">
                <div className="pwa-banner-content">
                    <img 
                        src="/icon-192.png" 
                        alt="AttendOTP Logo" 
                        className="pwa-app-icon"
                    />
                    <div className="pwa-text-group">
                        <div className="pwa-title">
                            Install AttendOTP App
                        </div>
                        <div className="pwa-subtitle">
                            Full-screen native feel • Fast 10s OTP & Anti-Proxy
                        </div>
                    </div>
                </div>

                <div className="pwa-action-group">
                    <button 
                        type="button" 
                        className="pwa-install-btn"
                        onClick={handleInstallClick}
                    >
                        <Download size={14} />
                        <span>Install</span>
                    </button>
                    <button 
                        type="button" 
                        className="pwa-dismiss-btn"
                        onClick={handleDismiss}
                        aria-label="Dismiss"
                        title="Dismiss"
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>

            {/* iOS Add to Home Screen Modal Guide */}
            {showIOSGuide && (
                <div className="aero-modal-backdrop" onClick={() => setShowIOSGuide(false)} style={{ zIndex: 10000 }}>
                    <div className="aero-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '360px', textAlign: 'center', padding: '22px' }}>
                        <div style={{ width: '56px', height: '56px', margin: '0 auto 12px', borderRadius: '14px', background: '#0B3064', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src="/icon-192.png" alt="AttendOTP" style={{ width: '42px', height: '42px', borderRadius: '10px' }} />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--dark-blue)', marginBottom: '8px' }}>
                            Install AttendOTP on iPhone
                        </h3>
                        <p style={{ fontSize: '0.84rem', color: 'var(--text-sub)', marginBottom: '16px', lineHeight: 1.5 }}>
                            To install as a fullscreen native app:
                        </p>
                        <ol style={{ textAlign: 'left', fontSize: '0.82rem', color: 'var(--dark-blue)', paddingLeft: '20px', lineHeight: 1.8, marginBottom: '20px' }}>
                            <li>Tap the <strong>Share</strong> button (box with upward arrow) in Safari.</li>
                            <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                            <li>Tap <strong>Add</strong> in the top-right corner.</li>
                        </ol>
                        <button 
                            type="button" 
                            className="duo-btn duo-btn-blue sm" 
                            style={{ width: '100%' }}
                            onClick={() => setShowIOSGuide(false)}
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

