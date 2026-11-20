import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Timer, Smartphone, Users } from 'lucide-react';
import { getDeviceSecurityInfo } from '../utils/deviceSecurity';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '755373927218-gv3bdo8sfup6tir4bc4te569ikufq5f4.apps.googleusercontent.com';

const ROLES = {
    student: { label: 'Student', hint: 'Student email address' },
    staff: { label: 'Faculty', hint: 'Faculty email address' },
    hod: { label: 'HOD', hint: 'HOD email address' },
    principal: { label: 'Principal', hint: 'principal@francisxavier.ac.in' },
    pt: { label: 'Sports', hint: 'pe.director@francisxavier.ac.in' }
};

export const LoginPage = ({ onLoginSuccess, currentRoute = 'student', onNavigateRoute }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [deviceInfo, setDeviceInfo] = useState(null);
    const [customEmail, setCustomEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const googleButtonRef = useRef(null);

    const [passwordLogin, setPasswordLogin] = useState(false);

    useEffect(() => {
        getDeviceSecurityInfo().then(setDeviceInfo);
        fetch('/api/auth/config').then((r) => r.json()).then((c) => setPasswordLogin(!!c.passwordLogin)).catch(() => {});
    }, []);

    // Google Identity Services
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
                window.google.accounts.id.renderButton(googleButtonRef.current, {
                    theme: 'outline',
                    size: 'large',
                    shape: 'pill',
                    text: 'continue_with',
                    logo_alignment: 'left',
                    width: 340
                });
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
                body: JSON.stringify({ credential: response.credential, deviceInfo: dev })
            });
            const data = await res.json();
            if (!res.ok) {
                setErrorMessage(data.message || data.error || 'Google sign-in failed. Use your @francisxavier.ac.in account.');
            } else {
                localStorage.setItem('fxec_token', data.token);
                localStorage.setItem('fxec_user', JSON.stringify(data.user));
                onLoginSuccess(data.user);
            }
        } catch (err) {
            setErrorMessage('Could not reach the attendance server.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoginWithEmail = async () => {
        const targetEmail = customEmail.trim();
        if (!targetEmail || !password) {
            setErrorMessage('Enter your college email and password.');
            return;
        }
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const dev = deviceInfo || await getDeviceSecurityInfo();
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail, password, deviceInfo: dev })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                localStorage.setItem('fxec_token', data.token);
                localStorage.setItem('fxec_user', JSON.stringify(data.user));
                onLoginSuccess(data.user);
            } else {
                setErrorMessage(data.message || data.error || 'Sign-in failed. Check your email and password.');
            }
        } catch (e) {
            setErrorMessage('Server connection error. Check that the attendance server is running.');
        } finally {
            setIsLoading(false);
        }
    };

    const active = ROLES[currentRoute] || ROLES.student;

    return (
        <div className="login-shell">
            <section className="login-brand" aria-hidden="true">
                <div className="lb-top">
                    <div className="sb-logo"><img src="/brand_logo.png" alt="" /></div>
                    <div>
                        <div className="sb-name">AttendOTP</div>
                        <div className="sb-sub">Francis Xavier Engineering College</div>
                    </div>
                </div>

                <div className="lb-mid">
                    <h1>Attendance that stays in the classroom.</h1>
                    <p>
                        Faculty broadcast a rolling room code. Students confirm it from their own
                        registered phone. Every period, every room, on one live record.
                    </p>
                </div>

                <div>
                    <div className="lb-points">
                        <div className="lb-point"><i><Timer size={19} /></i>Room codes that change every 10 seconds</div>
                        <div className="lb-point"><i><Smartphone size={19} /></i>Each student account is bound to one device</div>
                        <div className="lb-point"><i><Users size={19} /></i>Live rosters for faculty, HODs and the Principal</div>
                    </div>
                    <div className="lb-foot" style={{ marginTop: 28 }}>Autonomous Institution, Tirunelveli</div>
                </div>
            </section>

            <section className="login-panel">
                <div className="login-card ui-card">
                    <div className="login-mobile-brand">
                        <div className="sb-logo"><img src="/brand_logo.png" alt="FXEC" /></div>
                        <div>
                            <div className="sb-name">AttendOTP</div>
                            <div className="sb-sub">Francis Xavier Engg.</div>
                        </div>
                    </div>

                    <h2>Sign in</h2>
                    <p className="lead">Choose your portal, then continue with your college Google account.</p>

                    <div className="ui-segmented" role="tablist" aria-label="Portal">
                        {Object.entries(ROLES).map(([key, info]) => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={currentRoute === key}
                                className={currentRoute === key ? 'is-active' : ''}
                                onClick={() => onNavigateRoute && onNavigateRoute(key)}
                            >
                                {info.label}
                            </button>
                        ))}
                    </div>

                    {errorMessage && (
                        <div className="ui-alert ui-alert--danger" role="alert" style={{ marginTop: 18 }}>
                            <AlertCircle size={18} />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {passwordLogin && (
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleLoginWithEmail(); }}
                        className="u-col"
                        style={{ marginTop: 20 }}
                    >
                        <div className="ui-field">
                            <label className="ui-label" htmlFor="login-email">College email</label>
                            <div className="ui-input-wrap">
                                <Mail size={18} />
                                <input
                                    id="login-email"
                                    type="email"
                                    inputMode="email"
                                    className="ui-input"
                                    placeholder={active.hint}
                                    value={customEmail}
                                    onChange={(e) => setCustomEmail(e.target.value)}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="ui-field">
                            <label className="ui-label" htmlFor="login-password">Password</label>
                            <div className="ui-input-wrap">
                                <Lock size={18} />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="ui-input"
                                    placeholder="Your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    style={{ paddingRight: 48 }}
                                />
                                <button
                                    type="button"
                                    className="input-toggle"
                                    onClick={() => setShowPassword((s) => !s)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="ui-btn ui-btn--primary ui-btn--block" disabled={isLoading}>
                            <span>{isLoading ? 'Signing in' : `Continue as ${active.label}`}</span>
                            {!isLoading && <ArrowRight size={18} />}
                        </button>
                    </form>
                    )}

                    {passwordLogin && <div className="login-divider">or</div>}

                    <div style={{ minHeight: 44, display: 'flex', justifyContent: 'center', marginTop: passwordLogin ? 0 : 22 }}>
                        <div ref={googleButtonRef} />
                    </div>

                    <div className="login-foot">
                        <ShieldCheck size={15} />
                        <span>Student accounts are tied to their registered device</span>
                    </div>
                </div>
            </section>
        </div>
    );
};
