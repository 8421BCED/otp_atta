import React, { useState, useEffect } from 'react';
import { Shield, Clock, User, ChevronDown, CheckCircle2, AlertTriangle, Building2 } from 'lucide-react';

export const Header = ({ 
    currentUser, 
    onRoleChange, 
    simulatedTime, 
    setSimulatedTime, 
    activePeriod, 
    isMorningWindow, 
    isBreak 
}) => {
    const [realTime, setRealTime] = useState('');

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setRealTime(now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    const roles = [
        { id: 'student', label: 'Student', email: 'daniela.ug.24.it@francisxavier.ac.in', name: 'Daniel A' },
        { id: 'staff', label: 'Faculty / Staff', email: 'staff.it@francisxavier.ac.in', name: 'Prof. R. David' },
        { id: 'hod', label: 'HOD (IT)', email: 'hod.it@francisxavier.ac.in', name: 'Dr. J. B. Shajilin Labbai' },
        { id: 'principal', label: 'Principal', email: 'principal@francisxavier.ac.in', name: 'Dr. V. Velmurugan' }
    ];

    return (
        <header style={{ width: '100%' }}>
            {/* Top Accent Strip (Exact Match to FXEC Portal Header) */}
            <div className="fxec-top-accent-bar">
                <div className="fxec-top-links">
                    <span>FACULTY</span>
                    <span>STUDENT</span>
                    <span>ALUMNI</span>
                    <span>THE FXEC TIMES</span>
                    <span>COE</span>
                    <span>CAMPUS LIFE</span>
                </div>
                <div className="fxec-badge-row">
                    <span className="fxec-gold-pill">ADMISSION 2026 – 27</span>
                    <span className="fxec-accredit-chip">NIRF 51-100 BAND</span>
                    <span className="fxec-accredit-chip">NBA ACCREDITED</span>
                    <span className="fxec-accredit-chip">AUTONOMOUS</span>
                </div>
            </div>

            {/* Main Header Bar */}
            <div className="fxec-header-main">
                {/* Brand Identity */}
                <div className="fxec-brand">
                    <div className="fxec-logo-symbol">
                        <span>FX</span>
                    </div>
                    <div className="fxec-brand-text">
                        <h1>FRANCIS XAVIER <span>ENGINEERING COLLEGE</span></h1>
                        <p>An Autonomous Institution | Accredited by NBA | Tirunelveli, Tamil Nadu</p>
                    </div>
                </div>

                {/* Right Side: Role Quick-Switcher & Clock */}
                <div className="fxec-nav-controls">
                    {/* Time Simulator Tool for Testing Any Period */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(7, 23, 47, 0.85)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Clock size={16} color="var(--fxec-gold)" />
                        <span style={{ fontSize: '0.78rem', color: '#93C5FD', fontWeight: 600 }}>SIMULATOR:</span>
                        <select 
                            className="fx-select" 
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            value={simulatedTime || ''}
                            onChange={(e) => setSimulatedTime(e.target.value || null)}
                        >
                            <option value="">Live Clock ({realTime})</option>
                            <option value="09:02:00">09:02 AM (1st Period - 9:00 to 9:05 Window)</option>
                            <option value="09:15:00">09:15 AM (1st Period - Late Cutoff)</option>
                            <option value="10:00:00">10:00 AM (2nd Period)</option>
                            <option value="10:50:00">10:50 AM (Morning Break)</option>
                            <option value="11:15:00">11:15 AM (3rd Period)</option>
                            <option value="12:00:00">12:00 PM (4th Period)</option>
                            <option value="13:00:00">01:00 PM (Lunch Break: 12:40 - 1:30 PM)</option>
                            <option value="13:45:00">01:45 PM (5th Period)</option>
                            <option value="14:30:00">02:30 PM (6th Period / Lab)</option>
                            <option value="15:10:00">03:10 PM (Afternoon Break)</option>
                            <option value="15:45:00">03:45 PM (7th Period - Dismissal at 4:05 PM)</option>
                        </select>
                    </div>

                    {/* Quick Role Switcher */}
                    <div className="role-switcher-container">
                        {roles.map(r => (
                            <button
                                key={r.id}
                                className={`role-btn ${currentUser?.role === r.id ? 'active' : ''}`}
                                onClick={() => onRoleChange(r)}
                                title={`Switch to ${r.label}`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Active User Badge */}
                    <div className="user-profile-badge">
                        <div className="user-avatar">
                            {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                        </div>
                        <div className="user-details">
                            <div className="name">{currentUser?.name || 'Guest User'}</div>
                            <div className="meta">{currentUser?.role?.toUpperCase()} • {currentUser?.department}</div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
