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
                auto_select: false,
                hosted_domain: 'francisxavier.ac.in'
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
            const res = await fetch('http://localhost:5000/api/auth/demo-login', {
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
            { name: 'Daniel A (IT)', email: 'daniela.ug.24.it@francisxavier.ac.in', roll: '950724IT021' },
            { name: 'Arun Kumar S (IT)', email: 'arun.ug.24.it@francisxavier.ac.in', roll: '950724IT005' },
            { name: 'Kavitha M (IT)', email: 'kavitha.ug.24.it@francisxavier.ac.in', roll: '950724IT032' },
            { name: 'Priya Dharshini R (IT)', email: 'priya.ug.24.it@francisxavier.ac.in', roll: '950724IT045' }
        ],
        staff: [
            { name: 'Prof. R. David', email: 'staff.it@francisxavier.ac.in', dept: 'IT' },
            { name: 'Arunadevi M', email: 'arunadevim@francisxavier.ac.in', dept: 'Faculty' },
            { name: 'Gomathi Selvi R', email: 'gomathiselvir@francisxavier.ac.in', dept: 'Faculty' }
        ],
        hod: [
            { name: 'Dr. J. B. Shajilin Labbai (IT HOD)', email: 'ithod@francisxavier.ac.in', dept: 'IT' },
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
            <div className="aero-login-card fa-glass-card">
                
                {/* Logo & College Banner */}
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="aero-login-badge">
                        <span className="logo-symbol">FX</span>
                    </div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dark-blue)', letterSpacing: '-0.02em', marginTop: '12px' }}>
                        Francis Xavier Engineering College
                    </h1>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '3px' }}>
                        Autonomous Institution • OTP & Anti-Proxy Attendance
                    </p>
                </div>

                {/* Endpoint Navigation Tabs */}
                <div className="login-endpoint-tabs">
                    {Object.entries(routeTitles).map(([key, info]) => (
                        <button
                            key={key}
                            type="button"
                            className={`login-endpoint-tab ${currentRoute === key ? 'active' : ''}`}
                            onClick={() => onNavigateRoute && onNavigateRoute(key)}
                        >
                            {info.label}
                        </button>
                    ))}
                </div>

                {/* Active Portal Header */}
                <div className="portal-header-tag">
                    <span className="tag-dot" />
                    <span>{activeMeta.label} ({activeMeta.path})</span>
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
                    <label className="login-form-label">
                        <Mail size={14} color="var(--blue)" />
                        <span>Enter Official College Email:</span>
                    </label>

                    <div className="login-input-group">
                        <input
                            type="text"
                            className="login-email-input"
                            placeholder={activeMeta.hint}
                            value={customEmail}
                            onChange={(e) => setCustomEmail(e.target.value)}
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="login-submit-btn"
                            disabled={isLoading}
                        >
                            <span>{isLoading ? 'Verifying...' : 'Sign In'}</span>
                            <ArrowRight size={15} />
                        </button>
                    </div>
                </form>

                {/* Quick-Click Accounts from Seeded Database */}
                <div className="quick-accounts-section">
                    <div className="quick-accounts-title">
                        One-Click Verified Test Accounts:
                    </div>
                    <div className="quick-accounts-grid">
                        {activeAccounts.map((acc, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className="quick-account-chip"
                                onClick={() => {
                                    setCustomEmail(acc.email);
                                    handleLoginWithEmail(acc.email);
                                }}
                                disabled={isLoading}
                            >
                                <UserCheck size={14} color="var(--blue)" />
                                <div className="chip-details">
                                    <div className="chip-name">{acc.name}</div>
                                    <div className="chip-email">{acc.email}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Google Single Sign-On (Official SSO) */}
                <div className="sso-divider-row">
                    <span className="sso-divider-line" />
                    <span className="sso-divider-text">OR OFFICIAL GOOGLE SSO</span>
                    <span className="sso-divider-line" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div ref={googleButtonRef} style={{ minHeight: '44px', display: 'flex', justifyContent: 'center' }}></div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', textAlign: 'center' }}>
                        Only <strong>@francisxavier.ac.in</strong> official accounts are authorized.
                    </div>
                </div>

                {/* Anti-Proxy Device Pill */}
                <div className="aero-device-security-pill" style={{ marginTop: '12px' }}>
                    <ShieldCheck size={15} color="var(--blue)" />
                    <span>Hardware 1-Device Lock: Active & Verified on this device.</span>
                </div>

            </div>
        </div>
    );
};
