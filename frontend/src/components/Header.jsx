import React, { useState, useEffect, useRef } from 'react';
import { 
    Clock, 
    Calendar, 
    LogOut, 
    ChevronDown, 
    Shield, 
    User, 
    MessageSquarePlus,
    Search,
    Bell,
    CheckCircle2,
    ShieldCheck
} from 'lucide-react';

export const Header = ({ 
    currentUser, 
    onRoleChange, 
    onLogout,
    simulatedTime, 
    setSimulatedTime, 
    activePeriod,
    onOpenCalendar,
    onOpenFeedback
}) => {
    const [realTime, setRealTime] = useState('');
    const [timeParts, setTimeParts] = useState({ hm: '--:--', sec: '', ampm: '' });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [notifNotice, setNotifNotice] = useState(null);
    const dropdownRef = useRef(null);

    // Live Kolkata time synchronizer
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            const formatted = now.toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour12: true,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            setRealTime(formatted);

            // Break down for Canary precision clock layout
            const match = formatted.match(/^(\d{1,2}:\d{2}):(\d{2})\s*(AM|PM)?$/i);
            if (match) {
                setTimeParts({ hm: match[1], sec: `:${match[2]}`, ampm: match[3] || '' });
            } else {
                setTimeParts({ hm: formatted, sec: '', ampm: '' });
            }
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    // Smooth scroll shadow (hardware accelerated, zero layout shifts)
    useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 8);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close profile dropdown on outside click or escape key
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
    const userName = currentUser?.name ? currentUser.name.split(' ')[0] : 'User';

    const handleBellClick = () => {
        setNotifNotice('FCM Doorbell Live: Background alerts active');
        setTimeout(() => setNotifNotice(null), 3500);
    };

    return (
        <header className={`canary-header-wrapper ${scrolled ? 'is-scrolled' : ''}`}>
            <div className="canary-header-inner">
                
                {/* 1. Left Section: Official Logo & Clean Title */}
                <div className="canary-brand-col">
                    <img 
                        src="/brand_logo.png" 
                        alt="FXEC Logo" 
                        className="canary-logo-img"
                    />
                    <div className="canary-brand-text">
                        <span className="app-name">AttendOTP</span>
                        <span className="app-sub canary-brand-sub">Francis Xavier Engg</span>
                    </div>
                </div>

                {/* 2. Right Section: Synchronized Clock + Notification Bell + Profile with Gold Ring */}
                <div className="canary-controls-col">
                    
                    {/* Live Synchronized Clock Pill with Pulsing Live Beacon */}
                    <div className="canary-clock-pill" title="Live College Synchronized Clock (IST)">
                        <div className="canary-clock-icon-wrap">
                            <Clock size={15} strokeWidth={2.4} />
                        </div>
                        <div className="canary-clock-digits">
                            <span className="hm">{simulatedTime ? simulatedTime.slice(0, 5) : timeParts.hm}</span>
                            <span className="sec">{simulatedTime ? '' : timeParts.sec}</span>
                            <span className="ampm">{simulatedTime ? '' : timeParts.ampm}</span>
                        </div>
                        {/* Live Sync Beacon Dot */}
                        <div className="canary-live-beacon">
                            <span className="beacon-ping" />
                            <span className="beacon-dot" />
                        </div>
                    </div>

                    {/* Master Simulator (Principal only) */}
                    {currentUser?.role === 'principal' && (
                        <select 
                            className="time-sim-select"
                            value={simulatedTime || ''}
                            onChange={(e) => {
                                const val = e.target.value || null;
                                setSimulatedTime(val);
                                if (val) {
                                    localStorage.setItem('fxec_simulated_time', val);
                                } else {
                                    localStorage.removeItem('fxec_simulated_time');
                                }
                            }}
                            title="Principal Master College Clock"
                        >
                            <option value="">Live Clock</option>
                            <option value="09:02:00">09:02 AM (P1 - Morning)</option>
                            <option value="09:15:00">09:15 AM (P1 - Late)</option>
                            <option value="10:00:00">10:00 AM (P2)</option>
                            <option value="11:15:00">11:15 AM (P3)</option>
                            <option value="12:00:00">12:00 PM (P4)</option>
                            <option value="13:45:00">01:45 PM (P5)</option>
                            <option value="14:30:00">02:30 PM (P6)</option>
                            <option value="15:45:00">03:45 PM (P7)</option>
                        </select>
                    )}

                    {/* Notification Bell with Badge & Instant Trigger */}
                    <div className="canary-bell-wrap">
                        <button 
                            type="button" 
                            className="canary-bell-btn" 
                            onClick={handleBellClick}
                            title="Doorbell Notifications Active"
                            aria-label="Notifications"
                        >
                            <Bell size={18} strokeWidth={2} />
                            <span className="canary-bell-badge" />
                        </button>
                    </div>

                    {/* Divider */}
                    <span className="canary-v-divider" />

                    {/* Profile Menu: Avatar with College Emblem Gold Ring */}
                    <div className="canary-profile-container" ref={dropdownRef}>
                        <button
                            type="button"
                            className={`canary-avatar-trigger ${isDropdownOpen ? 'active' : ''}`}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            title="Profile & Session Settings"
                            aria-label="User Account Menu"
                        >
                            {/* Gold Ring around Avatar */}
                            <div className="canary-avatar-circle">
                                <span>{userInitial}</span>
                            </div>
                            <span className="canary-avatar-name">{userName}</span>
                            <ChevronDown size={14} strokeWidth={2.4} className={`canary-chevron ${isDropdownOpen ? 'rotated' : ''}`} />
                        </button>

                        {/* Floating Profile Dropdown Card */}
                        {isDropdownOpen && (
                            <div className="canary-dropdown-card">
                                <div className="dropdown-user-header">
                                    <div className="canary-avatar-circle large">
                                        <span>{userInitial}</span>
                                    </div>
                                    <div className="dropdown-user-info">
                                        <div className="dropdown-user-name">{currentUser?.name || 'Authorized Scholar'}</div>
                                        <div className="dropdown-user-email">{currentUser?.email}</div>
                                        <div className="dropdown-badges-row">
                                            <span className="dropdown-role-badge">
                                                {currentUser?.role === 'pt' ? 'PT DIRECTOR' : currentUser?.role?.toUpperCase()}
                                            </span>
                                            <span className="dropdown-dept-badge">
                                                {currentUser?.department || 'IT'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="dropdown-divider" />

                                <div className="dropdown-info-row">
                                    <span className="info-label">Account Status:</span>
                                    <span className="info-value text-green">
                                        <ShieldCheck size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
                                        Verified
                                    </span>
                                </div>

                                <div className="dropdown-divider" />

                                {/* Dropdown Actions */}
                                <div className="dropdown-actions-list">
                                    {onOpenCalendar && (
                                        <button
                                            type="button"
                                            className="dropdown-action-item"
                                            onClick={() => {
                                                setIsDropdownOpen(false);
                                                onOpenCalendar();
                                            }}
                                        >
                                            <Calendar size={15} color="#1E3A8A" />
                                            <span>Attendance Calendar</span>
                                        </button>
                                    )}

                                    {onOpenFeedback && (
                                        <button
                                            type="button"
                                            className="dropdown-action-item"
                                            onClick={() => {
                                                setIsDropdownOpen(false);
                                                onOpenFeedback();
                                            }}
                                        >
                                            <MessageSquarePlus size={15} color="#059669" />
                                            <span>Submit Feedback</span>
                                        </button>
                                    )}
                                </div>

                                <div className="dropdown-divider" />

                                {onLogout && (
                                    <button
                                        type="button"
                                        className="dropdown-logout-btn"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            onLogout();
                                        }}
                                    >
                                        <LogOut size={16} strokeWidth={2.2} />
                                        <span>Sign Out</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                </div>

            </div>

            {/* Quick Toast Notice when Bell is clicked */}
            {notifNotice && (
                <div className="canary-toast-banner">
                    <CheckCircle2 size={15} color="#16A34A" />
                    <span>{notifNotice}</span>
                </div>
            )}
        </header>
    );
};
