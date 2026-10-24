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

                {/* Direct Visible 1-Click Sign Out Button */}
                {onLogout && (
                    <button
                        type="button"
                        className="header-direct-logout-btn"
                        onClick={onLogout}
                        title="Sign Out of Portal"
                    >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                    </button>
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
                        <span className="header-avatar-name">{currentUser?.name?.split(' ')[0] || 'User'}</span>
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
                                <span className="info-label">Anti-Proxy Lock:</span>
                                <span className="info-value text-green">
                                    <Shield size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                                    Device Bound
                                </span>
                            </div>

                            <div className="dropdown-divider" />

                            <div style={{ padding: '4px 0 6px 0' }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                                    Quick Switch Portal:
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
                                    <button 
                                        type="button" 
                                        className="aero-glass-btn" 
                                        style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: '0.74rem', background: currentUser?.role === 'pt' ? '#FEF3C7' : '#FFFFFF', color: currentUser?.role === 'pt' ? '#B45309' : 'var(--dark-blue)', border: currentUser?.role === 'pt' ? '1px solid #F59E0B' : '1px solid #E2E8F0' }}
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            onRoleChange && onRoleChange({ id: 'pt', email: 'pe.director@francisxavier.ac.in' });
                                        }}
                                    >
                                        🏆 <strong style={{ marginLeft: '4px' }}>PT / Sports Portal</strong> (Dr. K. Rathna Kumar)
                                    </button>

                                    <button 
                                        type="button" 
                                        className="aero-glass-btn" 
                                        style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: '0.74rem', background: currentUser?.role === 'student' ? '#EFF6FF' : '#FFFFFF', color: currentUser?.role === 'student' ? 'var(--blue)' : 'var(--dark-blue)', border: currentUser?.role === 'student' ? '1px solid var(--blue)' : '1px solid #E2E8F0' }}
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            onRoleChange && onRoleChange({ id: 'student', email: 'daniela.ug.24.it@francisxavier.ac.in' });
                                        }}
                                    >
                                        🎓 <strong style={{ marginLeft: '4px' }}>Student Portal</strong> (Daniel A)
                                    </button>

                                    <button 
                                        type="button" 
                                        className="aero-glass-btn" 
                                        style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: '0.74rem', background: currentUser?.role === 'staff' ? '#EFF6FF' : '#FFFFFF', color: currentUser?.role === 'staff' ? 'var(--blue)' : 'var(--dark-blue)', border: currentUser?.role === 'staff' ? '1px solid var(--blue)' : '1px solid #E2E8F0' }}
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            onRoleChange && onRoleChange({ id: 'staff', email: 'staff.it@francisxavier.ac.in' });
                                        }}
                                    >
                                        👨‍🏫 <strong style={{ marginLeft: '4px' }}>Faculty Portal</strong> (Prof. R. David)
                                    </button>

                                    <button 
                                        type="button" 
                                        className="aero-glass-btn" 
                                        style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: '0.74rem', background: currentUser?.role === 'hod' ? '#EFF6FF' : '#FFFFFF', color: currentUser?.role === 'hod' ? 'var(--blue)' : 'var(--dark-blue)', border: currentUser?.role === 'hod' ? '1px solid var(--blue)' : '1px solid #E2E8F0' }}
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            onRoleChange && onRoleChange({ id: 'hod', email: 'caroline@francisxavier.ac.in' });
                                        }}
                                    >
                                        🏛️ <strong style={{ marginLeft: '4px' }}>HOD Portal</strong> (Dr. M. Caroline Viola Stella Mary)
                                    </button>
                                </div>
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
