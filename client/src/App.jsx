import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StudentDashboard } from './components/StudentDashboard';
import { StaffDashboard } from './components/StaffDashboard';
import { HODDashboard } from './components/HODDashboard';
import { PrincipalDashboard } from './components/PrincipalDashboard';
import { LoginModal } from './components/LoginModal';
import { getDeviceFingerprint } from './utils/fingerprint';
import { Clock, AlertTriangle, ShieldCheck, Calendar, LogIn } from 'lucide-react';

export function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [deviceInfo, setDeviceInfo] = useState(null);
    const [hierarchy, setHierarchy] = useState([]);
    const [currentPeriodInfo, setCurrentPeriodInfo] = useState(null);
    const [simulatedTime, setSimulatedTime] = useState(null);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [holidayStatus, setHolidayStatus] = useState(null);

    // 1. Initialize Device Fingerprint & Default Demo User
    useEffect(() => {
        const initDevice = async () => {
            const fp = await getDeviceFingerprint();
            setDeviceInfo(fp);

            // Default login as Student (Daniel A) if not logged in
            const savedToken = localStorage.getItem('fxec_token');
            const savedUser = localStorage.getItem('fxec_user');

            if (savedToken && savedUser) {
                try {
                    setCurrentUser(JSON.parse(savedUser));
                } catch (e) {
                    console.error('Error parsing stored user:', e);
                }
            } else {
                // Auto login as Student (Daniel A) for instant preview
                handleQuickRoleSwitch({
                    id: 'student',
                    email: 'daniela.ug.24.it@francisxavier.ac.in',
                    name: 'Daniel A'
                }, fp);
            }
        };

        initDevice();
    }, []);

    // 2. Fetch Location Hierarchy
    useEffect(() => {
        const loadHierarchy = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/locations/hierarchy');
                const data = await res.json();
                if (data.hierarchy) {
                    setHierarchy(data.hierarchy);
                }
            } catch (e) {
                console.error('Failed to load hierarchy:', e);
            }
        };
        loadHierarchy();
    }, []);

    // 3. Fetch Current Period Info & Holidays (re-runs when simulatedTime changes)
    useEffect(() => {
        const fetchPeriodInfo = async () => {
            try {
                const query = simulatedTime ? `?simulateTime=${encodeURIComponent(simulatedTime)}` : '';
                const [resPeriod, resHoliday] = await Promise.all([
                    fetch(`http://localhost:5000/api/attendance/current-period${query}`),
                    fetch(`http://localhost:5000/api/holidays/check?department=${currentUser?.department || 'IT'}`)
                ]);

                const dataPeriod = await resPeriod.json();
                const dataHoliday = await resHoliday.json();

                setCurrentPeriodInfo(dataPeriod);
                setHolidayStatus(dataHoliday);
            } catch (e) {
                console.error('Failed to fetch period info:', e);
            }
        };

        fetchPeriodInfo();
        const interval = setInterval(fetchPeriodInfo, 4000);
        return () => clearInterval(interval);
    }, [simulatedTime, currentUser?.department]);

    // Handle Quick Role Switcher
    const handleQuickRoleSwitch = async (roleObj, overrideFp) => {
        try {
            const fp = overrideFp || deviceInfo || await getDeviceFingerprint();
            const res = await fetch('http://localhost:5000/api/auth/demo-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: roleObj.email,
                    role: roleObj.id,
                    deviceInfo: fp
                })
            });
            const data = await res.json();
            if (data.token) {
                localStorage.setItem('fxec_token', data.token);
                localStorage.setItem('fxec_user', JSON.stringify(data.user));
                setCurrentUser(data.user);
            }
        } catch (e) {
            console.error('Role switch failed:', e);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
            {/* Header with Branding, Simulator & Role Switcher */}
            <Header 
                currentUser={currentUser} 
                onRoleChange={handleQuickRoleSwitch}
                simulatedTime={simulatedTime}
                setSimulatedTime={setSimulatedTime}
                activePeriod={currentPeriodInfo?.activePeriod}
                isMorningWindow={currentPeriodInfo?.isMorningWindow}
                isBreak={currentPeriodInfo?.isBreak}
            />

            {/* Main Application Full-Screen Workspace */}
            <main className="app-workspace">
                
                {/* Holiday Alert Banner (if declared) */}
                {holidayStatus?.isHoliday && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.25) 100%)',
                        border: '2px solid var(--fxec-rose)',
                        borderRadius: '14px',
                        padding: '16px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 0 25px rgba(239, 68, 68, 0.3)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <Calendar size={28} color="var(--fxec-rose)" />
                            <div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF' }}>
                                    HOLIDAY DECLARED: {holidayStatus.title}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#FCA5A5', marginTop: '2px' }}>
                                    Scope: {holidayStatus.scope === 'college' ? 'Institution-Wide (All Departments)' : `${holidayStatus.department} Department Only`} • {holidayStatus.reason}
                                </div>
                            </div>
                        </div>
                        <span className="badge-locked" style={{ fontSize: '0.82rem' }}>
                            ATTENDANCE SUSPENDED
                        </span>
                    </div>
                )}

                {/* College Live Schedule & Clock Status Banner */}
                <div className="college-clock-banner">
                    <div className="clock-info-col">
                        <div className="live-time-display">
                            {currentPeriodInfo?.currentTime || '09:00:00 AM'}
                        </div>
                        
                        <div className="period-badge-live">
                            <span className="pulse-dot"></span>
                            {currentPeriodInfo?.activePeriod ? (
                                <span>{currentPeriodInfo.activePeriod.name} ({currentPeriodInfo.activePeriod.start_time.slice(0, 5)} - {currentPeriodInfo.activePeriod.end_time.slice(0, 5)})</span>
                            ) : currentPeriodInfo?.isBeforeCollege ? (
                                <span>College Pre-Hours (Classes start 9:00 AM)</span>
                            ) : currentPeriodInfo?.isAfterCollege ? (
                                <span>College Dismissed for the Day (Buses Depart 4:40 PM)</span>
                            ) : (
                                <span>College Schedule Active</span>
                            )}
                        </div>

                        {currentPeriodInfo?.isMorningWindow && (
                            <span className="morning-warning-pill">
                                ⚠️ Morning 9:00 - 9:05 AM Day-Start Window Active
                            </span>
                        )}

                        {currentPeriodInfo?.isBreak && (
                            <span style={{ background: 'rgba(255,255,255,0.08)', color: '#CBD5E1', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 700 }}>
                                Break / Lunch Interval (Movement Tracking Paused)
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFF' }}>
                                Francis Xavier Engineering College
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#93C5FD' }}>
                                Academic Session 2026-27 • 9:00 AM to 4:05 PM
                            </div>
                        </div>
                        <button 
                            className="fx-btn-outline" 
                            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                            onClick={() => setIsLoginOpen(true)}
                        >
                            <LogIn size={14} /> Account Portal
                        </button>
                    </div>
                </div>

                {/* Role-Specific Dashboard Rendering */}
                {currentUser?.role === 'student' && (
                    <StudentDashboard 
                        currentUser={currentUser}
                        hierarchy={hierarchy}
                        currentPeriodInfo={currentPeriodInfo}
                        deviceInfo={deviceInfo}
                        simulatedTime={simulatedTime}
                    />
                )}

                {currentUser?.role === 'staff' && (
                    <StaffDashboard 
                        currentUser={currentUser}
                        hierarchy={hierarchy}
                        currentPeriodInfo={currentPeriodInfo}
                        simulatedTime={simulatedTime}
                    />
                )}

                {currentUser?.role === 'hod' && (
                    <HODDashboard 
                        currentUser={currentUser}
                    />
                )}

                {currentUser?.role === 'principal' && (
                    <PrincipalDashboard 
                        currentUser={currentUser}
                        hierarchy={hierarchy}
                    />
                )}

            </main>

            {/* Login / Authentication Modal */}
            <LoginModal 
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
                onLoginSuccess={(user) => setCurrentUser(user)}
                deviceInfo={deviceInfo}
            />
        </div>
    );
}

export default App;
