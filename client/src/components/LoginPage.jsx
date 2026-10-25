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
                
                {/* Clean, Premium Header */}
                <div className="clean-brand-header">
                    <div className="clean-app-icon">
                        <span>FX</span>
                    </div>
                    <div className="clean-title-group">
                        <h1 className="clean-app-title">FXEC Attendance</h1>
                        <p className="clean-app-subtitle">Autonomous Institution • Live OTP Portal</p>
                    </div>
                </div>

                {/* Minimal Segmented Role Tabs */}
                <div className="clean-role-nav">
                    {Object.entries(routeTitles).map(([key, info]) => (
                        <button
                            key={key}
                            type="button"
                            className={`clean-role-tab ${currentRoute === key ? 'active' : ''}`}
                            onClick={() => onNavigateRoute && onNavigateRoute(key)}
                        >
                            {info.label.replace(' Portal', '').replace(' / Sports', '')}
                        </button>
                    ))}
                </div>

                {/* Clean Alert */}
                {errorMessage && (
                    <div className="clean-alert-badge">
                        <AlertCircle size={15} style={{ flexShrink: 0 }} />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Modern Form */}
                <form 
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleLoginWithEmail();
                    }} 
                    className="clean-login-form"
                >
                    <div className="clean-input-box">
                        <Mail size={16} className="clean-input-icon" />
                        <input
                            type="email"
                            inputMode="email"
                            className="clean-text-input"
                            placeholder={activeMeta.hint}
                            value={customEmail}
                            onChange={(e) => setCustomEmail(e.target.value)}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck="false"
                        />
                    </div>

                    <button
                        type="submit"
                        className="clean-submit-btn"
                        disabled={isLoading}
                    >
                        <span>{isLoading ? 'Signing In...' : `Sign in to ${activeMeta.label.replace(' Portal', '')}`}</span>
                        <ArrowRight size={16} />
                    </button>
                </form>

                {/* Divider */}
                <div className="clean-divider">
                    <span>or quick test demo</span>
                </div>

                {/* 1-Tap Demo Quick Chips (Compact 2-Column Grid) */}
                <div className="clean-demo-grid">
                    {activeAccounts.slice(0, 4).map((acc, idx) => {
                        const firstName = acc.name.split(' ')[0] + ' ' + (acc.name.split(' ')[1] || '');
                        return (
                            <button
                                key={idx}
                                type="button"
                                className="clean-demo-chip"
                                onClick={() => {
                                    setCustomEmail(acc.email);
                                    handleLoginWithEmail(acc.email);
                                }}
                                disabled={isLoading}
                            >
                                <span className="chip-dot"></span>
                                <span className="chip-label">{firstName}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Real Google SSO Button Container */}
                <div className="clean-sso-wrapper">
                    <div ref={googleButtonRef} style={{ minHeight: '40px', width: '100%', display: 'flex', justifyContent: 'center' }}></div>
                </div>

                {/* Security Tag */}
                <div className="clean-secure-footer">
                    <ShieldCheck size={13} color="#10B981" />
                    <span>Hardware 1-Device Binding Active</span>
                </div>

            </div>
        </div>
    );
};
