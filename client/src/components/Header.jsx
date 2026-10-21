import React, { useState, useEffect } from 'react';
import { Clock, User } from 'lucide-react';

export const Header = ({ 
    currentUser, 
    onRoleChange, 
    simulatedTime, 
    setSimulatedTime, 
    activePeriod 
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
        { id: 'staff', label: 'Staff', email: 'staff.it@francisxavier.ac.in', name: 'Prof. R. David' },
        { id: 'hod', label: 'HOD', email: 'hod.it@francisxavier.ac.in', name: 'Dr. J. B. Shajilin Labbai' },
        { id: 'principal', label: 'Principal', email: 'principal@francisxavier.ac.in', name: 'Dr. V. Velmurugan' }
    ];

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
                {/* Time / Period Pill */}
                <div className="header-time-pill">
                    <Clock size={15} color="#60A5FA" />
                    <span>{simulatedTime || realTime}</span>
                    {activePeriod && (
                        <span className="header-period-tag">{activePeriod.name}</span>
                    )}
                </div>

                {/* Simulator (for quick period testing) */}
                <select 
                    className="time-sim-select"
                    value={simulatedTime || ''}
                    onChange={(e) => setSimulatedTime(e.target.value || null)}
                    title="Simulate schedule time for testing"
                >
                    <option value="">Live Time</option>
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

                {/* Role Switcher Tabs */}
                <div className="role-switcher-container">
                    {roles.map(r => (
                        <button
                            key={r.id}
                            className={`role-btn ${currentUser?.role === r.id ? 'active' : ''}`}
                            onClick={() => onRoleChange(r)}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {/* User Pill */}
                <div className="user-profile-badge">
                    <div className="user-avatar">
                        {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                    </div>
                    <div className="user-details">
                        <div className="name">{currentUser?.name || 'User'}</div>
                        <div className="meta">{currentUser?.role?.toUpperCase()} • {currentUser?.department || 'IT'}</div>
                    </div>
                </div>
            </div>
        </header>
    );
};
