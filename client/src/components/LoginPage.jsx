import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, AlertCircle, Sparkles, UserCheck, ArrowRight, Mail } from 'lucide-react';
import { getDeviceSecurityInfo } from '../utils/deviceSecurity';

const GOOGLE_CLIENT_ID = "755373927218-gv3bdo8sfup6tir4bc4te569ikufq5f4.apps.googleusercontent.com";

export const LoginPage = ({ onLoginSuccess, currentRoute = 'student', onNavigateRoute }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [deviceInfo, setDeviceInfo] = useState(null);
    const [customEmail, setCustomEmail] = useState('');
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
                auto_select: false
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
            const res = await fetch('/api/auth/google', {
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

    // Instant official email login handler
    const handleLoginWithEmail = async (emailToUse) => {
        const targetEmail = (emailToUse || customEmail).trim();
        if (!targetEmail) {
            setErrorMessage('Please enter your official college email address.');
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
            const dev = deviceInfo || await getDeviceSecurityInfo();
            const res = await fetch('/api/auth/demo-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: targetEmail,
                    deviceInfo: dev
                })
            });

            const data = await res.json();
            if (res.ok && data.token) {
                localStorage.setItem('fxec_token', data.token);
                localStorage.setItem('fxec_user', JSON.stringify(data.user));
                onLoginSuccess(data.user);
            } else {
                setErrorMessage(data.error || `No user found for "${targetEmail}". Please check your email.`);
            }
        } catch (e) {
            console.error('Email login error:', e);
            setErrorMessage('Server connection error. Please make sure the attendance server is running.');
        } finally {
            setIsLoading(false);
        }
    };

    // Quick accounts tailored for current endpoint
    const portalAccounts = {
        student: [
            { name: 'Daniel A (IT)', email: 'daniela.ug.24.it@francisxavier.ac.in' },
            { name: 'Arun Kumar S (IT)', email: 'arun.ug.24.it@francisxavier.ac.in' },
            { name: 'Kavitha M (IT)', email: 'kavitha.ug.24.it@francisxavier.ac.in' },
            { name: 'Priya Dharshini R (IT)', email: 'priya.ug.24.it@francisxavier.ac.in' }
        ],
        staff: [
            { name: 'Prof. R. David', email: 'staff.it@francisxavier.ac.in', dept: 'IT' },
            { name: 'Arunadevi M', email: 'arunadevim@francisxavier.ac.in', dept: 'Faculty' },
            { name: 'Gomathi Selvi R', email: 'gomathiselvir@francisxavier.ac.in', dept: 'Faculty' }
        ],
        hod: [
            { name: 'Dr. M. Caroline Viola Stella Mary (IT HOD)', email: 'caroline@francisxavier.ac.in', dept: 'IT' },
            { name: 'Dr. Gomathy (CSE HOD)', email: 'csehod@francisxavier.ac.in', dept: 'CSE' }
        ],
        principal: [
            { name: 'Dr. V. Velmurugan (Principal)', email: 'principal@francisxavier.ac.in', dept: 'Executive' }
        ],
        pt: [
            { name: 'Dr. K. Rathna Kumar (PT Director)', email: 'pe.director@francisxavier.ac.in', dept: 'Sports & Physical Education' }
        ]
    };

    const routeTitles = {
        student: { label: 'Student Portal', path: '/students', hint: 'daniela.ug.24.it@francisxavier.ac.in' },
        staff: { label: 'Staff Portal', path: '/staffs', hint: 'staff.it@francisxavier.ac.in' },
        hod: { label: 'HOD Portal', path: '/hod', hint: 'ithod@francisxavier.ac.in' },
        principal: { label: 'Principal Portal', path: '/principal', hint: 'principal@francisxavier.ac.in' },
        pt: { label: 'PT / Sports Portal', path: '/pt', hint: 'pe.director@francisxavier.ac.in' }
    };

    const activeMeta = routeTitles[currentRoute] || routeTitles.student;
    const activeAccounts = portalAccounts[currentRoute] || portalAccounts.student;

    return (
        <div className="aero-login-wrapper">
            <div className="aero-login-card">
                
                {/* 3D Duolingo-Style Mascot / College Shield */}
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="aero-login-badge">
                        <span className="logo-symbol">FX</span>
                    </div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--dark-blue)', letterSpacing: '-0.02em', marginTop: '12px', marginBottom: '2px' }}>
                        Francis Xavier Engineering
                    </h1>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--blue)', background: '#EFF6FF', padding: '2px 10px', borderRadius: '12px', border: '1.5px solid #BFDBFE' }}>
                        <Sparkles size={11} color="var(--blue)" />
                        <span>Autonomous • Anti-Proxy PWA</span>
                    </div>
                </div>

                {/* 3D Chunky Endpoint Navigation Tabs */}
                <div className="login-endpoint-tabs">
                    {Object.entries(routeTitles).map(([key, info]) => (
                        <button
                            key={key}
                            type="button"
                            className={`login-endpoint-tab ${currentRoute === key ? 'active' : ''}`}
                            onClick={() => onNavigateRoute && onNavigateRoute(key)}
                        >
                            {info.label.replace(' Portal', '')}
                        </button>
                    ))}
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="aero-alert-error">
                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Official Email Input Box for Direct Testing */}
                <form 
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleLoginWithEmail();
                    }} 
                    className="login-email-form"
                >
                    <div className="login-form-label">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <Mail size={13} color="var(--blue)" />
                            <span>Official College Email</span>
                        </span>
                        <span style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 700 }}>
                            {activeMeta.label}
                        </span>
                    </div>

                    <div className="login-input-group">
                        <input
                            type="email"
                            inputMode="email"
                            className="login-email-input"
                            placeholder={activeMeta.hint}
                            value={customEmail}
                            onChange={(e) => setCustomEmail(e.target.value)}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck="false"
                        />
                        <button
                            type="submit"
                            className="login-submit-btn"
                            disabled={isLoading}
                        >
                            <span>{isLoading ? 'Verifying' : 'Sign In'}</span>
                            <ArrowRight size={15} />
                        </button>
                    </div>
                </form>

                {/* Quick-Click Accounts with 3D Physics Feel */}
                <div className="quick-accounts-section">
                    <div className="quick-accounts-title">
                        <span>⚡ 1-Click Fast Pass</span>
                        <span style={{ fontSize: '0.64rem', color: 'var(--blue)', fontWeight: 800 }}>INSTANT DEMO</span>
                    </div>
                    <div className="quick-accounts-grid">
                        {activeAccounts.map((acc, idx) => {
                            const initials = acc.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('');
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    className="quick-account-chip"
                                    onClick={() => {
                                        setCustomEmail(acc.email);
                                        handleLoginWithEmail(acc.email);
                                    }}
                                    disabled={isLoading}
                                    title={`Login instantly as ${acc.name}`}
                                >
                                    <div className="chip-avatar">
                                        {initials}
                                    </div>
                                    <div className="chip-details">
                                        <div className="chip-name">{acc.name}</div>
                                        <div className="chip-email">{acc.email.split('@')[0]}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Real Google SSO Button Container */}
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <div ref={googleButtonRef} style={{ minHeight: '44px', display: 'flex', justifyContent: 'center', width: '100%' }}></div>
                </div>

                {/* PWA Hardware Security & Device Binding Footer */}
                <div className="pwa-security-footer">
                    <ShieldCheck size={13} color="#10B981" />
                    <span>Hardware 1-Device Fingerprint Active</span>
                </div>

            </div>
        </div>
    );
};
