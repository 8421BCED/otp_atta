import React, { useState, useEffect, useRef } from 'react';
import { Clock, Calendar, LogOut, ChevronDown, Shield, User } from 'lucide-react';

export const Header = ({ 
    currentUser, 
    onRoleChange, 
    onLogout,
    simulatedTime, 
    setSimulatedTime, 
    activePeriod,
    onOpenCalendar
}) => {
    const [realTime, setRealTime] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setRealTime(now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
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

    return (
        <header className="fxec-header-main">
            {/* Clean Logo & Title */}
            <div className="fxec-brand">
                <div className="fxec-logo-symbol">FX</div>
                <div className="fxec-brand-text">
                    <h1>OTP Attendance</h1>
                    <p>Francis Xavier Engineering College</p>
                </div>
            </div>

            {/* Navigation & Controls */}
            <div className="fxec-nav-controls">
                {/* Attendance History (Positioned to the left of the time pill) */}
                {currentUser?.role === 'student' && onOpenCalendar && (
                    <button
                        type="button"
                        className="header-history-btn"
                        onClick={onOpenCalendar}
                        title="View Full Attendance History"
                    >
                        <Calendar size={15} color="var(--blue)" />
                        <span>Attendance History</span>
                    </button>
                )}

                {/* Time / Period Pill */}
                <div className="header-time-pill">
                    <Clock size={15} color="var(--blue)" />
                    <span>{simulatedTime || realTime}</span>
                    {activePeriod && (
                        <span className="header-period-tag">{activePeriod.name}</span>
                    )}
                </div>

                {/* Simulator: ONLY available to Principal as Master College Time Controller */}
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
                        title="Principal Master College Clock: Moves time across entire system"
                    >
                        <option value="">Live System Time</option>
                        <option value="09:02:00">09:02 AM (Period 1 - Morning)</option>
                        <option value="09:15:00">09:15 AM (Period 1 - Late)</option>
                        <option value="10:00:00">10:00 AM (Period 2)</option>
                        <option value="10:50:00">10:50 AM (Morning Break)</option>
                        <option value="11:15:00">11:15 AM (Period 3)</option>
                        <option value="12:00:00">12:00 PM (Period 4)</option>
                        <option value="13:00:00">01:00 PM (Lunch Break)</option>
                        <option value="13:45:00">01:45 PM (Period 5)</option>
                        <option value="14:30:00">02:30 PM (Period 6)</option>
                        <option value="15:10:00">03:10 PM (Break)</option>
                        <option value="15:45:00">03:45 PM (Period 7)</option>
                    </select>
                )}

                {/* Top-Right Profile Icon & Dropdown Menu */}
                <div className="profile-menu-container" ref={dropdownRef}>
                    <button
                        type="button"
                        className={`header-avatar-btn ${isDropdownOpen ? 'active' : ''}`}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        title="User Profile & Settings"
                        aria-label="User Profile"
                    >
                        <span className="avatar-initial">{userInitial}</span>
                        <ChevronDown size={14} className={`dropdown-chevron ${isDropdownOpen ? 'rotated' : ''}`} />
                    </button>

                    {/* Floating Dropdown Card */}
                    {isDropdownOpen && (
                        <div className="profile-dropdown-card">
                            <div className="dropdown-user-header">
                                <div className="dropdown-avatar-circle">
                                    {userInitial}
                                </div>
                                <div className="dropdown-user-info">
                                    <div className="dropdown-user-name">{currentUser?.name || 'User'}</div>
                                    <div className="dropdown-user-email">{currentUser?.email}</div>
                                    <div className="dropdown-badges-row">
                                        <span className="dropdown-role-badge">
                                            {currentUser?.role?.toUpperCase()}
                                        </span>
                                        <span className="dropdown-dept-badge">
                                            {currentUser?.department || 'IT'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="dropdown-divider" />

                            {currentUser?.role === 'student' && currentUser?.roll_number && (
                                <div className="dropdown-info-row">
                                    <span className="info-label">Roll Number:</span>
                                    <span className="info-value font-mono">{currentUser.roll_number}</span>
                                </div>
                            )}

                            <div className="dropdown-info-row">
                                <span className="info-label">Anti-Proxy Lock:</span>
                                <span className="info-value text-green">
                                    <Shield size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                                    Device Bound
                                </span>
                            </div>

                            <div className="dropdown-divider" />

                            <button
                                type="button"
                                className="dropdown-logout-btn"
                                onClick={() => {
                                    setIsDropdownOpen(false);
                                    onLogout();
                                }}
                            >
                                <LogOut size={15} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
