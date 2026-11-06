import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, AlertCircle, Sparkles, UserCheck, ArrowRight, Mail } from 'lucide-react';
import { getDeviceSecurityInfo } from '../utils/deviceSecurity';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "755373927218-gv3bdo8sfup6tir4bc4te569ikufq5f4.apps.googleusercontent.com";

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
                itp_support: true,
                use_fedcm_for_prompt: false
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

    const routeTitles = {
        student: { label: 'Student Portal', path: '/students', hint: 'Enter official student email' },
        staff: { label: 'Staff Portal', path: '/staffs', hint: 'Enter official faculty email' },
        hod: { label: 'HOD Portal', path: '/hod', hint: 'Enter official HOD email' },
        principal: { label: 'Principal Portal', path: '/principal', hint: 'principal@francisxavier.ac.in' },
        pt: { label: 'PT / Sports Portal', path: '/pt', hint: 'pe.director@francisxavier.ac.in' }
    };

    const activeMeta = routeTitles[currentRoute] || routeTitles.student;

    return (
        <div className="aero-login-wrapper">
            <div className="aero-login-card">
                
                {/* Clean, Premium Header */}
                <div className="clean-brand-header">
                    <img 
                        src="/brand_logo.png" 
                        alt="Logo" 
                        style={{ width: '58px', height: '58px', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.14))' }} 
                    />
                    <div className="clean-title-group">
                        <h1 className="clean-app-title">AttendOTP</h1>
                        <p className="clean-app-subtitle">Autonomous Institution • Live Anti-Proxy Portal</p>
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
