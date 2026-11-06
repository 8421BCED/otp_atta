import React, { useState } from 'react';
import { Lock, Mail, ShieldAlert, KeyRound, Sparkles } from 'lucide-react';

export const LoginModal = ({ isOpen, onClose, onLoginSuccess, deviceInfo }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    deviceInfo
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || data.error || 'Authentication failed');
            } else {
                localStorage.setItem('fxec_token', data.token);
                localStorage.setItem('fxec_user', JSON.stringify(data.user));
                onLoginSuccess(data.user);
                onClose();
            }
        } catch (err) {
            setError('Could not connect to authentication server');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fx-modal-backdrop" onClick={onClose}>
            <div className="fx-modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ textAlign: 'center' }}>
                    <div className="fxec-logo-symbol" style={{ margin: '0 auto 12px auto' }}>
                        <span>FX</span>
                    </div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFF' }}>
                        FXEC Single Sign-On Portal
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#93C5FD', marginTop: '4px' }}>
                        Sign in with your official @francisxavier.ac.in credentials
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid var(--fxec-rose)',
                        borderRadius: '10px',
                        padding: '12px',
                        color: '#FCA5A5',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                    }}>
                        <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>{error}</div>
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label className="picker-label">College Email Address</label>
                        <div style={{ position: 'relative', marginTop: '4px' }}>
                            <input 
                                type="email"
                                className="fx-select"
                                style={{ width: '100%', paddingLeft: '38px' }}
                                placeholder="username@francisxavier.ac.in"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <Mail size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                        </div>
                    </div>

                    <div>
                        <label className="picker-label">Password</label>
                        <div style={{ position: 'relative', marginTop: '4px' }}>
                            <input 
                                type="password"
                                className="fx-select"
                                style={{ width: '100%', paddingLeft: '38px' }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <KeyRound size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                        </div>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--smoke-subtle)' }}>
                        Anti-Proxy Protection: On successful sign-in, this account will be bound to your current mobile device ({deviceInfo?.deviceName || 'Workstation / Mobile'}).
                    </div>

                    <button type="submit" className="fx-btn-primary" disabled={isLoading} style={{ marginTop: '6px' }}>
                        {isLoading ? 'Verifying...' : 'Sign In to Portal'}
                    </button>
                </form>

            </div>
        </div>
    );
};
