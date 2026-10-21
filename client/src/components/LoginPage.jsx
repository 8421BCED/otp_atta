import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, AlertCircle, LogIn, Sparkles, UserCheck } from 'lucide-react';
import { getDeviceSecurityInfo } from '../utils/deviceSecurity';

const GOOGLE_CLIENT_ID = "755373927218-gv3bdo8sfup6tir4bc4te569ikufq5f4.apps.googleusercontent.com";

export const LoginPage = ({ onLoginSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [deviceInfo, setDeviceInfo] = useState(null);
    const googleButtonRef = useRef(null);

    useEffect(() => {
        const initDevice = async () => {
            const dev = await getDeviceSecurityInfo();
            setDeviceInfo(dev);
        };
        initDevice();
    }, []);

    // Load Google Identity Services Script
    useEffect(() => {
        const scriptId = 'google-gsi-client';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = initializeGoogleSignIn;
            document.body.appendChild(script);
        } else if (window.google?.accounts?.id) {
            initializeGoogleSignIn();
        }
    }, [deviceInfo]);

    const initializeGoogleSignIn = () => {
        if (!window.google?.accounts?.id) return;

        try {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCredentialResponse,
                auto_select: false,
                hosted_domain: 'francisxavier.ac.in' // College domain hint
            });

            if (googleButtonRef.current) {
                window.google.accounts.id.renderButton(
                    googleButtonRef.current,
                    {
                        theme: 'filled_blue',
                        size: 'large',
                        shape: 'pill',
                        text: 'continue_with',
                        logo_alignment: 'left',
                        width: 320
                    }
                );
            }
        } catch (e) {
            console.error('Google GSI init failed:', e);
        }
    };

    const handleGoogleCredentialResponse = async (response) => {
        setErrorMessage(null);
        setIsLoading(true);

        try {
            const dev = deviceInfo || await getDeviceSecurityInfo();
            const res = await fetch('http://localhost:5000/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credential: response.credential,
                    deviceInfo: dev
                })
            });

            const data = await res.json();
            if (!res.ok) {
                setErrorMessage(data.error || 'Google login failed. Please ensure you select your @francisxavier.ac.in account.');
            } else {
                localStorage.setItem('fxec_token', data.token);
                localStorage.setItem('fxec_user', JSON.stringify(data.user));
                onLoginSuccess(data.user);
            }
        } catch (err) {
            setErrorMessage('Network connection error connecting to college attendance server.');
        } finally {
            setIsLoading(false);
        }
    };

    // Quick demo login handler for development and testing
    const handleDemoLogin = async (roleObj) => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const dev = deviceInfo || await getDeviceSecurityInfo();
            const res = await fetch('http://localhost:5000/api/auth/demo-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: roleObj.email,
                    role: roleObj.role,
                    deviceInfo: dev
                })
            });
            const data = await res.json();
            if (data.token) {
                localStorage.setItem('fxec_token', data.token);
                localStorage.setItem('fxec_user', JSON.stringify(data.user));
                onLoginSuccess(data.user);
            } else {
                setErrorMessage(data.error || 'Failed to authenticate');
            }
        } catch (e) {
            setErrorMessage('Server connection error.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="aero-login-wrapper">
            <div className="aero-login-card fa-glass-card">
                
                {/* Logo & College Banner */}
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="aero-login-badge">
                        <span className="logo-symbol">FX</span>
                        <div className="gloss-sheen"></div>
                    </div>
                    <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em', marginTop: '12px' }}>
                        Francis Xavier Engineering College
                    </h1>
                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', marginTop: '4px' }}>
                        Autonomous Institution • Department of Information Technology
                    </p>
                    <div className="aero-tag-pill" style={{ marginTop: '8px' }}>
                        <Sparkles size={13} color="#00E5FF" />
                        <span>Anti-Proxy Real-Time Attendance Portal</span>
                    </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="aero-alert-error">
                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Google Sign In Area */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', margin: '20px 0' }}>
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                        Official College Single Sign-On:
                    </div>

                    {/* Official Google GSI Render Container */}
                    <div ref={googleButtonRef} style={{ minHeight: '44px', display: 'flex', justifyContent: 'center' }}></div>

                    <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: '320px' }}>
                        Strict domain restriction: Only <strong>@francisxavier.ac.in</strong> email accounts are permitted.
                    </div>
                </div>

                {/* Hardware Anti-Proxy Notice */}
                <div className="aero-device-security-pill">
                    <ShieldCheck size={16} color="#00E676" />
                    <span>Device Protection: Automatically binds this mobile device/workstation to your student ID.</span>
                </div>

                {/* One-Click Quick Role Switchers */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '16px', marginTop: '8px' }}>
                    <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginBottom: '10px', textAlign: 'center' }}>
                        ONE-CLICK DEVELOPMENT DEMO ACCOUNTS
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {[
                            { name: 'Daniel A (Student)', email: 'daniela.ug.24.it@francisxavier.ac.in', role: 'student' },
                            { name: 'Prof. David (Staff)', email: 'staff.it@francisxavier.ac.in', role: 'staff' },
                            { name: 'Dr. Shajilin (HOD)', email: 'hod.it@francisxavier.ac.in', role: 'hod' },
                            { name: 'Principal Office', email: 'principal@francisxavier.ac.in', role: 'principal' }
                        ].map((acc, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className="aero-demo-login-btn"
                                onClick={() => handleDemoLogin(acc)}
                                disabled={isLoading}
                            >
                                <UserCheck size={14} color="#00E5FF" />
                                <span>{acc.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};
