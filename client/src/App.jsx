import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StudentDashboard } from './components/StudentDashboard';
import { StaffDashboard } from './components/StaffDashboard';
import { HODDashboard } from './components/HODDashboard';
import { PrincipalDashboard } from './components/PrincipalDashboard';
import { LoginModal } from './components/LoginModal';
import { getDeviceSecurityInfo } from './utils/deviceSecurity';
import { Calendar } from 'lucide-react';

export function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [deviceInfo, setDeviceInfo] = useState(null);
    const [hierarchy, setHierarchy] = useState([]);
    const [currentPeriodInfo, setCurrentPeriodInfo] = useState(null);
    const [simulatedTime, setSimulatedTime] = useState(() => {
        return localStorage.getItem('fxec_simulated_time') || null;
    });
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [holidayStatus, setHolidayStatus] = useState(null);

    // 1. Initialize Device & Default User
    useEffect(() => {
        const init = async () => {
            const dev = await getDeviceSecurityInfo();
            setDeviceInfo(dev);

            const savedToken = localStorage.getItem('fxec_token');
            const savedUser = localStorage.getItem('fxec_user');

            if (savedToken && savedUser) {
                try {
                    setCurrentUser(JSON.parse(savedUser));
                } catch (e) {
                    console.error('Error parsing user:', e);
                }
            } else {
                handleQuickRoleSwitch({
                    id: 'student',
                    email: 'daniela.ug.24.it@francisxavier.ac.in',
                    name: 'Daniel A'
                }, dev);
            }
        };

        init();
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

    // 3. Fetch Period Info & Holidays
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
            const fp = overrideFp || deviceInfo || await getDeviceSecurityInfo();
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
        <div className="app-container">
            {/* Top Navigation */}
            <Header 
                currentUser={currentUser} 
                onRoleChange={handleQuickRoleSwitch}
                simulatedTime={simulatedTime}
                setSimulatedTime={setSimulatedTime}
                activePeriod={currentPeriodInfo?.activePeriod}
            />

            {/* Main Content Workspace */}
            <main className="app-workspace">
                
                {/* Holiday Banner (Only if declared) */}
                {holidayStatus?.isHoliday && (
                    <div className="alert-box-error" style={{ marginBottom: '16px' }}>
                        <Calendar size={18} />
                        <div>
                            <strong>Holiday Declared: {holidayStatus.title}</strong>
                            <span style={{ marginLeft: '8px', opacity: 0.85 }}>({holidayStatus.scope === 'college' ? 'College-wide' : `${holidayStatus.department} Department`})</span>
                        </div>
                    </div>
                )}

                {/* Active Dashboard View */}
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
                        simulatedTime={simulatedTime}
                        setSimulatedTime={setSimulatedTime}
                    />
                )}

            </main>

            {/* Login Modal */}
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
