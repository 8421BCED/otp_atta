import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StudentDashboard } from './components/StudentDashboard';
import { StaffDashboard } from './components/StaffDashboard';
import { HODDashboard } from './components/HODDashboard';
import { PrincipalDashboard } from './components/PrincipalDashboard';
import { StrangeOpsDashboard } from './components/StrangeOpsDashboard';
import { LoginPage } from './components/LoginPage';
import { AttendanceCalendarModal } from './components/AttendanceCalendarModal';
import { getDeviceSecurityInfo } from './utils/deviceSecurity';
import { Calendar } from 'lucide-react';

const getRoleFromPath = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('strange')) return 'strange';
    if (path.includes('student')) return 'student';
    if (path.includes('staff')) return 'staff';
    if (path.includes('hod')) return 'hod';
    if (path.includes('princip')) return 'principal';
    return null;
};

const getPathFromRole = (role) => {
    switch (role) {
        case 'strange': return '/strange';
        case 'student': return '/students';
        case 'staff': return '/staffs';
        case 'hod': return '/hod';
        case 'principal': return '/principal';
        default: return '/';
    }
};

export function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [deviceInfo, setDeviceInfo] = useState(null);
    const [hierarchy, setHierarchy] = useState([]);
    const [currentPeriodInfo, setCurrentPeriodInfo] = useState(null);
    const [simulatedTime, setSimulatedTime] = useState(() => {
        return localStorage.getItem('fxec_simulated_time') || null;
    });
    const [holidayStatus, setHolidayStatus] = useState(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Active endpoint route (/students, /staffs, /hod, /principal)
    const [currentRoute, setCurrentRoute] = useState(() => getRoleFromPath() || 'student');

    // Handle browser back/forward buttons
    useEffect(() => {
        const onPopState = () => {
            const role = getRoleFromPath();
            if (role) {
                setCurrentRoute(role);
            }
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const handleNavigateRoute = (role) => {
        setCurrentRoute(role);
        const targetPath = getPathFromRole(role);
        if (window.location.pathname !== targetPath) {
            window.history.pushState(null, '', targetPath);
        }
    };

    // 1. Initialize Device & Saved User
    useEffect(() => {
        const init = async () => {
            const dev = await getDeviceSecurityInfo();
            setDeviceInfo(dev);

            const savedToken = localStorage.getItem('fxec_token');
            const savedUser = localStorage.getItem('fxec_user');

            if (savedToken && savedUser) {
                try {
                    const parsedUser = JSON.parse(savedUser);
                    setCurrentUser(parsedUser);
                    // If at root or invalid path, sync URL to user's role
                    const pathRole = getRoleFromPath();
                    if (!pathRole) {
                        handleNavigateRoute(parsedUser.role || 'student');
                    } else {
                        setCurrentRoute(pathRole);
                    }
                } catch (e) {
                    console.error('Error parsing user:', e);
                }
            } else {
                // If not logged in, ensure URL path matches currentRoute
                const pathRole = getRoleFromPath();
                if (pathRole) {
                    setCurrentRoute(pathRole);
                }
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
                handleNavigateRoute(data.user.role);
            }
        } catch (e) {
            console.error('Role switch failed:', e);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('fxec_token');
        localStorage.removeItem('fxec_user');
        sessionStorage.removeItem('fxec_strange_auth');
        setCurrentUser(null);
        if (currentRoute === 'strange') {
            handleNavigateRoute('student');
        } else {
            const pathRole = getRoleFromPath() || 'student';
            setCurrentRoute(pathRole);
        }
    };

    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
        handleNavigateRoute(user.role || 'student');
    };

    // Dedicated IT Operations master terminal route (/strange)
    if (currentRoute === 'strange') {
        return (
            <div className="app-container">
                <Header 
                    currentUser={currentUser || { name: 'IT Operations Console', role: 'it_ops' }} 
                    onRoleChange={handleQuickRoleSwitch}
                    onLogout={handleLogout}
                    simulatedTime={simulatedTime}
                    setSimulatedTime={setSimulatedTime}
                    activePeriod={currentPeriodInfo?.activePeriod}
                    onOpenCalendar={() => setIsCalendarOpen(true)}
                />
                <main className="app-workspace">
                    <StrangeOpsDashboard onLogout={handleLogout} />
                </main>
            </div>
        );
    }

    // If no user is logged in, show dedicated Login Page tailored to current route
    if (!currentUser) {
        return (
            <LoginPage 
                onLoginSuccess={handleLoginSuccess}
                currentRoute={currentRoute}
                onNavigateRoute={handleNavigateRoute}
            />
        );
    }

    // Determine active dashboard view: respect user role or active route
    const activeViewRole = currentRoute || currentUser?.role || 'student';

    return (
        <div className="app-container">
            {/* Top Navigation */}
            <Header 
                currentUser={currentUser} 
                onRoleChange={handleQuickRoleSwitch}
                onLogout={handleLogout}
                simulatedTime={simulatedTime}
                setSimulatedTime={setSimulatedTime}
                activePeriod={currentPeriodInfo?.activePeriod}
                onOpenCalendar={() => setIsCalendarOpen(true)}
            />

            {/* Attendance Calendar Modal (Accessible from top navbar) */}
            <AttendanceCalendarModal 
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                currentUser={currentUser}
            />

            {/* Main Content Workspace */}
            <main className="app-workspace">
                
                {/* Holiday Banner (Only if declared) */}
                {holidayStatus?.isHoliday && (
                    <div className="aero-alert-error" style={{ marginBottom: '16px' }}>
                        <Calendar size={18} />
                        <div>
                            <strong>Holiday Declared: {holidayStatus.title}</strong>
                            <span style={{ marginLeft: '8px', opacity: 0.85 }}>({holidayStatus.scope === 'college' ? 'College-wide' : `${holidayStatus.department} Department`})</span>
                        </div>
                    </div>
                )}

                {/* Active Dashboard View */}
                {activeViewRole === 'student' && (
                    <StudentDashboard 
                        currentUser={currentUser}
                        hierarchy={hierarchy}
                        currentPeriodInfo={currentPeriodInfo}
                        deviceInfo={deviceInfo}
                        simulatedTime={simulatedTime}
                    />
                )}

                {activeViewRole === 'staff' && (
                    <StaffDashboard 
                        currentUser={currentUser}
                        hierarchy={hierarchy}
                        currentPeriodInfo={currentPeriodInfo}
                    />
                )}

                {activeViewRole === 'hod' && (
                    <HODDashboard 
                        currentUser={currentUser}
                        hierarchy={hierarchy}
                    />
                )}

                {activeViewRole === 'principal' && (
                    <PrincipalDashboard 
                        currentUser={currentUser}
                        hierarchy={hierarchy}
                        simulatedTime={simulatedTime}
                        setSimulatedTime={setSimulatedTime}
                    />
                )}

                {activeViewRole === 'strange' && (
                    <StrangeOpsDashboard />
                )}

            </main>
        </div>
    );
}

export default App;
