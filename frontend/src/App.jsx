import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StudentDashboard } from './components/StudentDashboard';
import { StaffDashboard } from './components/StaffDashboard';
import { HODDashboard } from './components/HODDashboard';
import { PrincipalDashboard } from './components/PrincipalDashboard';
import { StrangeOpsDashboard } from './components/StrangeOpsDashboard';
import { PTSportsDashboard } from './components/PTSportsDashboard';
import { LoginPage } from './components/LoginPage';
import { ClassroomSelectionPage } from './components/ClassroomSelectionPage';
import { AttendanceCalendarModal } from './components/AttendanceCalendarModal';
import { StudentLeavePortal } from './components/StudentLeavePortal';
import { FeedbackPage } from './components/FeedbackPage';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { FeedbackModal } from './components/FeedbackModal';
import { OfflineStatusPage, NotFoundPage, ForbiddenPage, ServerErrorPage } from './components/StatusPages';
import { requestFcmPermissionAndToken, onForegroundMessage } from './firebase';
import { getDeviceSecurityInfo } from './utils/deviceSecurity';
import { Calendar } from 'lucide-react';

const KNOWN_ROUTES = ['student', 'staff', 'hod', 'principal', 'pt', 'strange'];

const getRoleFromPath = () => {
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    if (!path || path === '') return 'student';
    if (path.includes('strange')) return 'strange';
    if (path.includes('pt') || path.includes('sports')) return 'pt';
    if (path.includes('student')) return 'student';
    if (path.includes('staff')) return 'staff';
    if (path.includes('hod')) return 'hod';
    if (path.includes('princip')) return 'principal';
    // If user typed an unknown route path like /unknown-page
    return '404';
};

const getPathFromRole = (role) => {
    switch (role) {
        case 'strange': return '/strange';
        case 'pt': return '/pt';
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
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [activeMobileTab, setActiveMobileTab] = useState('home'); // 'home' | 'classroom' | 'calendar'
    const [selectedStudentRoom, setSelectedStudentRoom] = useState(null);

    // Network Online / Offline Detection
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

    // Global Server Error State (502 / Gateway down / 403 Forbidden)
    const [serverErrorState, setServerErrorState] = useState(null); // null | '502' | '403'

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

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
                    // Initialize FCM Push Notifications for user
                    requestFcmPermissionAndToken(parsedUser);
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
                const res = await fetch('/api/locations/hierarchy');
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
                    fetch(`/api/attendance/current-period${query}`),
                    fetch(`/api/holidays/check?department=${currentUser?.department || 'IT'}`)
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
            const res = await fetch('/api/auth/demo-login', {
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
        requestFcmPermissionAndToken(user);
        handleNavigateRoute(user.role || 'student');
    };

    // Handlers for Attendance Calendar Navigation (prevents duplicate stacking or old modal fallback)
    const handleOpenCalendar = () => {
        setIsCalendarOpen(false);
        setActiveMobileTab('calendar');
    };

    const handleCloseCalendar = () => {
        setIsCalendarOpen(false);
        setActiveMobileTab('home');
    };

    // 1. Check Offline Status First (User Data / Wi-Fi disconnected)
    if (!isOnline) {
        return <OfflineStatusPage onRetry={() => setIsOnline(navigator.onLine)} />;
    }

    // 2. Global Server Error View (e.g. 502 Bad Gateway)
    if (serverErrorState === '502') {
        return <ServerErrorPage errorCode="502" onRetry={() => setServerErrorState(null)} />;
    }

    // 3. 403 Access Forbidden / Device Mismatch
    if (serverErrorState === '403') {
        return (
            <ForbiddenPage 
                reason="Access Forbidden: Unauthorized hardware proxy or role permission restriction."
                onAction={() => {
                    setServerErrorState(null);
                    handleLogout();
                }} 
            />
        );
    }

    // 4. 404 Route Not Found View
    if (currentRoute === '404') {
        return <NotFoundPage onGoHome={() => handleNavigateRoute('student')} />;
    }

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
                    onOpenCalendar={handleOpenCalendar}
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
            <>
                <LoginPage 
                    onLoginSuccess={handleLoginSuccess}
                    currentRoute={currentRoute}
                    onNavigateRoute={handleNavigateRoute}
                />
                <PWAInstallPrompt />
            </>
        );
    }

    // Determine active dashboard view: respect logged-in user role
    const activeViewRole = currentUser?.role || currentRoute || 'student';

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
                onOpenCalendar={handleOpenCalendar}
                onOpenFeedback={() => {
                    setIsCalendarOpen(false);
                    setActiveMobileTab('feedback');
                }}
            />

            {/* Attendance Calendar Modal (Only for non-mobile or top-bar explicit popups) */}
            {isCalendarOpen && activeMobileTab !== 'calendar' && (
                <AttendanceCalendarModal 
                    isOpen={true}
                    onClose={handleCloseCalendar}
                    currentUser={currentUser}
                />
            )}

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

                {/* Dedicated Attendance & History Detailed Page */}
                {activeMobileTab === 'calendar' && (
                    <AttendanceCalendarModal 
                        isOpen={true}
                        isInlinePage={true}
                        onClose={handleCloseCalendar}
                        currentUser={currentUser}
                    />
                )}

                {/* Dedicated Classroom Selection View (When tapped from bottom bar) */}
                {activeViewRole === 'student' && activeMobileTab === 'classroom' && (
                    <ClassroomSelectionPage 
                        hierarchy={hierarchy}
                        currentRoomId={selectedStudentRoom}
                        onSelectRoom={(_bId, _fId, rId) => {
                            setSelectedStudentRoom(rId);
                            setActiveMobileTab('home');
                        }}
                        onBackToHome={() => setActiveMobileTab('home')}
                    />
                )}

                {/* Dedicated Student Leave & OD Application View (When tapped from bottom bar) */}
                {activeViewRole === 'student' && activeMobileTab === 'leave' && (
                    <StudentLeavePortal 
                        currentUser={currentUser}
                        onBackToHome={() => setActiveMobileTab('home')}
                    />
                )}

                {/* Dedicated Feedback & Issue Reporting Page */}
                {activeMobileTab === 'feedback' && (
                    <FeedbackPage 
                        currentUser={currentUser}
                        deviceInfo={deviceInfo}
                        onBackToHome={() => setActiveMobileTab('home')}
                    />
                )}

                {/* Active Dashboard View (When on Home tab) */}
                {activeViewRole === 'student' && activeMobileTab === 'home' && (
                    <StudentDashboard 
                        currentUser={currentUser}
                        hierarchy={hierarchy}
                        currentPeriodInfo={currentPeriodInfo}
                        deviceInfo={deviceInfo}
                        simulatedTime={simulatedTime}
                        selectedRoom={selectedStudentRoom}
                        onSelectRoom={setSelectedStudentRoom}
                        onOpenLeave={() => setActiveMobileTab('leave')}
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

                {activeViewRole === 'pt' && (
                    <PTSportsDashboard 
                        currentUser={currentUser}
                    />
                )}

                {activeViewRole === 'strange' && (
                    <StrangeOpsDashboard />
                )}

            </main>

            {/* Mobile Bottom Navigation Bar (PWA Horizontal Menu Icons) */}
            {currentUser && (
                <MobileBottomNav 
                    activeTab={activeMobileTab}
                    onTabChange={(tab) => {
                        setActiveMobileTab(tab);
                        if (tab !== 'calendar') {
                            setIsCalendarOpen(false);
                        }
                    }}
                    onOpenCalendar={handleOpenCalendar}
                    onOpenClassroom={() => {
                        setIsCalendarOpen(false);
                        setActiveMobileTab('classroom');
                    }}
                    onOpenFeedback={() => {
                        setIsCalendarOpen(false);
                        setActiveMobileTab('feedback');
                    }}
                    onLogout={handleLogout}
                    currentUser={currentUser}
                />
            )}

            {/* Inbuilt PWA Install Prompt Banner */}
            <PWAInstallPrompt />

            {/* Global User Feedback / Issue Report Modal */}
            <FeedbackModal 
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
                currentUser={currentUser}
                deviceInfo={deviceInfo}
            />
        </div>
    );
}

export default App;
