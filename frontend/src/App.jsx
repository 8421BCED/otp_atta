import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { WifiOff, Building2, CalendarDays, CalendarOff, CalendarPlus, ClipboardCheck, FileText, LayoutDashboard, MapPin, MessageSquare, Radio, Users } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { LoginPage } from './components/LoginPage';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { AlertsControl } from './components/AlertsControl';
import { NotFoundPage, ForbiddenPage, ServerErrorPage } from './components/StatusPages';
import { resyncPush } from './push';
import { onSessionExpired } from './api';
import { usePolling } from './hooks';
import { derivePeriodInfo, istParts, nowMs, useClockSelector } from './clock';
import { getDeviceSecurityInfo } from './utils/deviceSecurity';

// Each role's screens load on demand, so a student's phone never downloads the principal's code.
const page = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const StudentDashboard = page(() => import('./components/StudentDashboard'), 'StudentDashboard');
const StaffDashboard = page(() => import('./components/StaffDashboard'), 'StaffDashboard');
const HODDashboard = page(() => import('./components/HODDashboard'), 'HODDashboard');
const PrincipalDashboard = page(() => import('./components/PrincipalDashboard'), 'PrincipalDashboard');
const StrangeOpsDashboard = page(() => import('./components/StrangeOpsDashboard'), 'StrangeOpsDashboard');
const PTSportsDashboard = page(() => import('./components/PTSportsDashboard'), 'PTSportsDashboard');
const ClassroomSelectionPage = page(() => import('./components/ClassroomSelectionPage'), 'ClassroomSelectionPage');
const AttendanceCalendarModal = page(() => import('./components/AttendanceCalendarModal'), 'AttendanceCalendarModal');
const StudentLeavePortal = page(() => import('./components/StudentLeavePortal'), 'StudentLeavePortal');
const FeedbackPage = page(() => import('./components/FeedbackPage'), 'FeedbackPage');

const PageFallback = () => (
    <div className="page-skeleton" aria-busy="true" aria-label="Loading">
        <div className="skel skel--wide" /><div className="skel" /><div className="skel skel--short" />
    </div>
);

const getRoleFromPath = () => {
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    if (!path) return 'student';
    if (path.includes('strange')) return 'strange';
    if (path.includes('pt') || path.includes('sports')) return 'pt';
    if (path.includes('student')) return 'student';
    if (path.includes('staff')) return 'staff';
    if (path.includes('hod')) return 'hod';
    if (path.includes('princip')) return 'principal';
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

const NAV = {
    student: [
        { id: 'home', label: 'Home', icon: LayoutDashboard },
        { id: 'classroom', label: 'Classroom', icon: MapPin },
        { id: 'leave', label: 'Leave & OD', short: 'Leave', icon: FileText },
        { id: 'calendar', label: 'History', icon: CalendarDays },
        { id: 'feedback', label: 'Feedback', icon: MessageSquare }
    ],
    staff: [
        { id: 'home', label: 'Live class', short: 'Live', icon: Radio },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'leave', label: 'Leave requests', short: 'Leave', icon: FileText }
    ],
    hod: [
        { id: 'home', label: 'Overview', icon: LayoutDashboard },
        { id: 'live', label: 'Live class', short: 'Live', icon: Radio },
        { id: 'approvals', label: 'Approvals', icon: ClipboardCheck },
        { id: 'students', label: 'Students', icon: Users }
    ],
    principal: [
        { id: 'home', label: 'Overview', icon: LayoutDashboard },
        { id: 'staff', label: 'Staff', icon: Users },
        { id: 'campus', label: 'Campus', icon: Building2 },
        { id: 'holidays', label: 'Holidays', icon: CalendarPlus }
    ],
    default: [
        { id: 'home', label: 'Dashboard', short: 'Home', icon: LayoutDashboard }
    ]
};

// One line under each page title.
const SUB = {
    student: {
        home: 'Your day, your room and your code',
        classroom: 'Browse every building, floor and lab',
        leave: 'Apply for leave or On-Duty and track it',
        calendar: 'Your attendance by month',
        feedback: 'Report a problem or suggest an improvement'
    },
    staff: { home: 'Broadcast the room code and watch the roster fill', students: 'Your department at a glance', leave: 'Mentee applications waiting for you' },
    hod: { home: 'Department status today', live: 'Teach a class and take attendance', approvals: 'Leave requests and On-Duty passes', students: 'Locks, unlocks and registered phones' },
    principal: { home: 'College-wide attendance today', staff: 'Where every faculty member is right now', campus: 'Buildings, floors and rooms', holidays: 'Declare a college holiday' },
    pt: { home: 'Sports On-Duty passes and athletes' },
    menu: { calendar: 'Attendance and movement by month', feedback: 'Report a problem or suggest an improvement' }
};

// Secondary pages for faculty-type roles live in the user menu.
const MENU = [
    { id: 'calendar', label: 'My calendar', icon: CalendarDays },
    { id: 'feedback', label: 'Send feedback', icon: MessageSquare }
];

const readStored = (key) => {
    try { return localStorage.getItem(key); } catch (e) { return null; }
};

export function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [deviceInfo, setDeviceInfo] = useState(null);
    const [hierarchy, setHierarchy] = useState([]);
    const [currentPeriodInfo, setCurrentPeriodInfo] = useState(null);
    const [simulatedTime, setSimulatedTime] = useState(() => readStored('fxec_simulated_time'));
    const [authChecked, setAuthChecked] = useState(false);
    const [view, setView] = useState('home');
    const [selectedStudentRoom, setSelectedStudentRoom] = useState(null);
    const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
    const [serverErrorState, setServerErrorState] = useState(null);
    const [currentRoute, setCurrentRoute] = useState(() => getRoleFromPath() || 'student');

    useEffect(() => {
        const on = () => setIsOnline(true);
        const off = () => setIsOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => {
            window.removeEventListener('online', on);
            window.removeEventListener('offline', off);
        };
    }, []);

    useEffect(() => {
        const onPopState = () => {
            const role = getRoleFromPath();
            if (role) setCurrentRoute(role);
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

    // Device + saved session. The saved user is only a hint to avoid a flash of the login screen:
    // the server is asked who this token really belongs to before anything is shown.
    useEffect(() => {
        const init = async () => {
            setDeviceInfo(await getDeviceSecurityInfo());

            const savedToken = readStored('fxec_token');
            if (!savedToken) { setAuthChecked(true); return; }

            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    try { localStorage.setItem('fxec_user', JSON.stringify(data.user)); } catch (e) { /* ignore */ }
                    setCurrentUser(data.user);
                    setCurrentRoute(getRoleFromPath() || data.user.role || 'student');
                    resyncPush();
                } else if (res.status === 401 || res.status === 403) {
                    try { localStorage.removeItem('fxec_token'); localStorage.removeItem('fxec_user'); } catch (e) { /* ignore */ }
                }
                // Any other status (server busy): keep the token and let the user retry.
            } catch (e) {
                console.error('Could not verify the saved session:', e);
            } finally {
                setAuthChecked(true);
            }
        };
        init();
    }, []);
    // Campus structure: loaded after sign-in, so thousands of students opening the app at 8:55 do not all hit the sign-in limit.
    useEffect(() => {
        if (!currentUser) return;
        fetch('/api/locations/hierarchy')
            .then((r) => r.json())
            .then((d) => d.hierarchy && setHierarchy(d.hierarchy))
            .catch((e) => console.error('Failed to load hierarchy:', e));
    }, [currentUser]);

    // One request tells the screen the period, the kind of day (holiday, weekly off) and the
    // simulation flag. The countdown itself runs on the local clock, so this can be slow.
    const pollPeriod = useCallback(async () => {
        try {
            const query = simulatedTime ? `?simulateTime=${encodeURIComponent(simulatedTime)}` : '';
            const res = await fetch(`/api/attendance/current-period${query}`);
            if (res.ok) setCurrentPeriodInfo(await res.json());
        } catch (e) {
            console.error('Failed to fetch period info:', e);
        }
    }, [simulatedTime]);
    // The server is asked once a minute (timetable, holidays, flags). Which period it is right now is worked
    // out on the phone from the synced clock, so the change lands on the exact second.
    usePolling(pollPeriod, 60000, !!currentUser);

    const simOn = !!currentPeriodInfo?.simulationEnabled && !!simulatedTime;
    const timeAt = (ms) => (simOn ? simulatedTime : istParts(ms).time);
    const periodKey = useClockSelector((ms) => {
        const p = derivePeriodInfo(currentPeriodInfo?.allPeriods, timeAt(ms));
        return p ? [p.activePeriod ? p.activePeriod.id : 0, +p.isBreak, +p.isBeforeCollege, +p.isAfterCollege, +p.isMorningWindow, +p.isPastMorningCutoff, +p.isLunchWindow, +p.isPastLunchCutoff].join('|') : '';
    });
    // Rebuilt only when something actually changes (a period flips), not every second.
    const periodInfo = useMemo(
        () => (currentPeriodInfo ? { ...currentPeriodInfo, ...(derivePeriodInfo(currentPeriodInfo.allPeriods, timeAt(nowMs())) || {}) } : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [currentPeriodInfo, periodKey, simulatedTime]
    );
    const handleLogout = () => {
        try {
            localStorage.removeItem('fxec_token');
            localStorage.removeItem('fxec_user');
            sessionStorage.removeItem('fxec_strange_auth');
        } catch (e) { /* ignore */ }
        setCurrentUser(null);
        setView('home');
        if (currentRoute === 'strange') handleNavigateRoute('student');
        else setCurrentRoute(getRoleFromPath() || 'student');
    };

    // Token expired or rejected by the server: return to sign in.
    useEffect(() => onSessionExpired(() => handleLogout()), [currentRoute]);

    // The clock override only exists when the server allows time simulation (testing).
    const simulationEnabled = !!currentPeriodInfo?.simulationEnabled;
    useEffect(() => {
        if (currentPeriodInfo && !simulationEnabled && simulatedTime) {
            setSimulatedTime(null);
            try { localStorage.removeItem('fxec_simulated_time'); } catch (e) { /* ignore */ }
        }
    }, [currentPeriodInfo, simulationEnabled, simulatedTime]);

    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
        setView('home');
        resyncPush();
        handleNavigateRoute(user.role || 'student');
    };

    // ---- Global states ----
    // Losing signal for a moment must not blank the app. The screen stays, the clock keeps running, and this notice explains.
    const offlineNotice = !isOnline && (
        <div className="offline-banner" role="status">
            <WifiOff size={16} />
            <span>No connection. The clock keeps running; attendance and updates resume when the signal returns.</span>
        </div>
    );
    if (serverErrorState === '502') return <ServerErrorPage errorCode="502" onRetry={() => setServerErrorState(null)} />;
    if (serverErrorState === '403') {
        return (
            <ForbiddenPage
                reason="This device or role is not allowed to open this page."
                onAction={() => { setServerErrorState(null); handleLogout(); }}
            />
        );
    }
    if (currentRoute === '404') return <NotFoundPage onGoHome={() => handleNavigateRoute('student')} />;

    if (currentRoute === 'strange') {
        return <Suspense fallback={<PageFallback />}><StrangeOpsDashboard onLogout={handleLogout} /></Suspense>;
    }

    if (!authChecked) {
        return <div className="status-page"><div className="spinner-row" role="status"><span className="spinner" /><span>Opening AttendOTP</span></div></div>;
    }

    if (!currentUser) {
        return (
            <>
                {offlineNotice}
                <LoginPage
                    onLoginSuccess={handleLoginSuccess}
                    currentRoute={currentRoute}
                    onNavigateRoute={handleNavigateRoute}
                />
                <PWAInstallPrompt />
            </>
        );
    }

    const role = currentUser.role || 'student';
    const withSub = (list, key) => list.map((n) => ({ ...n, sub: (SUB[key] || {})[n.id] }));
    const navItems = withSub(NAV[role] || NAV.default, role);
    const menuItems = role === 'student' ? [] : withSub(MENU, 'menu');
    const activeNav = [...navItems, ...menuItems].some((n) => n.id === view) ? view : 'home';

    let body = null;
    if (activeNav === 'calendar') {
        body = (
            <AttendanceCalendarModal
                isOpen={true}
                isInlinePage={true}
                onClose={() => setView('home')}
                currentUser={currentUser}
            />
        );
    } else if (activeNav === 'feedback') {
        body = (
            <FeedbackPage
                currentUser={currentUser}
                deviceInfo={deviceInfo}
                onBackToHome={() => setView('home')}
            />
        );
    } else if (role === 'student' && activeNav === 'classroom') {
        body = (
            <ClassroomSelectionPage
                hierarchy={hierarchy}
                currentRoomId={selectedStudentRoom}
                onSelectRoom={(_b, _f, rId) => { setSelectedStudentRoom(rId); setView('home'); }}
                onBackToHome={() => setView('home')}
            />
        );
    } else if (role === 'student' && activeNav === 'leave') {
        body = <StudentLeavePortal currentUser={currentUser} onBackToHome={() => setView('home')} />;
    } else if (role === 'student') {
        body = (
            <StudentDashboard
                currentUser={currentUser}
                hierarchy={hierarchy}
                currentPeriodInfo={periodInfo}
                deviceInfo={deviceInfo}
                simulatedTime={simulatedTime}
                selectedRoom={selectedStudentRoom}
                onSelectRoom={setSelectedStudentRoom}
                onOpenLeave={() => setView('leave')}
                onOpenClassroom={() => setView('classroom')}
            />
        );
    } else if (role === 'staff') {
        body = <StaffDashboard currentUser={currentUser} hierarchy={hierarchy} currentPeriodInfo={periodInfo} section={activeNav} />;
    } else if (role === 'hod') {
        body = (
            <HODDashboard
                currentUser={currentUser}
                hierarchy={hierarchy}
                currentPeriodInfo={periodInfo}
                section={activeNav}
                onNavigate={setView}
            />
        );
    } else if (role === 'principal') {
        body = (
            <PrincipalDashboard
                currentUser={currentUser}
                hierarchy={hierarchy}
                simulatedTime={simulatedTime}
                setSimulatedTime={simulationEnabled ? setSimulatedTime : () => {}}
                simulationEnabled={simulationEnabled}
                section={activeNav}
            />
        );
    } else if (role === 'pt') {
        body = <PTSportsDashboard currentUser={currentUser} />;
    }

    return (
        <>
            {offlineNotice}
            <AppShell
                user={currentUser}
                navItems={navItems}
                menuItems={menuItems}
                activeNav={activeNav}
                onNavigate={setView}
                onLogout={handleLogout}
                periodInfo={periodInfo}
                simulatedTime={simulatedTime}
                setSimulatedTime={simulationEnabled ? setSimulatedTime : null}
            >
                {role !== 'student' && currentPeriodInfo?.dayStatus && (currentPeriodInfo.dayStatus.off || currentPeriodInfo.dayStatus.exempt) && (
                    <div className="ui-alert ui-alert--warn" style={{ marginBottom: 18 }}>
                        <CalendarOff size={18} />
                        <div>
                            <strong>
                                {currentPeriodInfo.dayStatus.type === 'weekend'
                                    ? 'Weekly off. No classes today.'
                                    : currentPeriodInfo.dayStatus.off
                                        ? `Holiday: ${currentPeriodInfo.dayStatus.title}. No classes today.`
                                        : `Event in progress: ${currentPeriodInfo.dayStatus.title}.`}
                            </strong>
                        </div>
                    </div>
                )}                {role === 'student' && activeNav === 'home' && <div style={{ marginBottom: 18 }}><AlertsControl variant="card" /></div>}
                <Suspense fallback={<PageFallback />}>{body}</Suspense>
            </AppShell>
            <PWAInstallPrompt />
        </>
    );
}

export default App;




