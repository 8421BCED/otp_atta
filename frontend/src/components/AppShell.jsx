import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, Download, LogOut, ShieldCheck } from 'lucide-react';
import { AlertsControl } from './AlertsControl';
import { useInstallState } from './PWAInstallPrompt';
import { promptInstall } from '../installPrompt';
import { useClock, clockDisplay, nowMs, isClockSynced } from '../clock';

// College time comes from the server (see clock.js), never from the phone's own clock.
const istDate = () =>
    new Date(nowMs()).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' });

const ROLE_LABEL = { student: 'Student', staff: 'Faculty', hod: 'Head of Department', principal: 'Principal', pt: 'Physical Education' };

const CLOCK_OPTIONS = [
    ['', 'Live clock'], ['09:02:00', '09:02  Period 1, on time'], ['09:15:00', '09:15  Period 1, late'], ['10:00:00', '10:00  Period 2'],
    ['11:15:00', '11:15  Period 3'], ['12:00:00', '12:00  Period 4'], ['13:45:00', '13:45  Period 5'], ['14:30:00', '14:30  Period 6'], ['15:45:00', '15:45  Period 7']
];

const Clock = ({ simulatedTime }) => {
    const { time } = useClock(); // re-renders every second from the synced clock
    const live = !simulatedTime;
    const { hm, sec, ampm } = live ? clockDisplay() : { hm: simulatedTime.slice(0, 5), sec: '', ampm: '' };
    return (
        <div className="clock-chip" title={isClockSynced() ? 'College time (IST), synced with the server' : 'College time (IST), syncing'} data-time={time}>
            <span className={`ui-dot ${live ? 'ui-dot--live' : ''}`} style={live ? undefined : { color: 'var(--warn)' }} />
            <span>{hm}<small>{sec} {ampm}</small></span>
        </div>
    );
};
// A highlight that slides to the active tab instead of jumping. Only transform and size change, so it
// stays on the GPU and never causes layout. The first placement is instant (no slide-in on load).
const useGlider = (activeKey) => {
    const ref = useRef(null);
    useLayoutEffect(() => {
        const root = ref.current;
        if (!root) return undefined;
        const place = () => {
            const el = root.querySelector('[data-active="true"]');
            if (!el || !el.offsetWidth) { root.style.setProperty('--glide-w', '0px'); return; }
            root.style.setProperty('--glide-x', `${el.offsetLeft}px`);
            root.style.setProperty('--glide-y', `${el.offsetTop}px`);
            root.style.setProperty('--glide-w', `${el.offsetWidth}px`);
            root.style.setProperty('--glide-h', `${el.offsetHeight}px`);
        };
        place();
        const raf = requestAnimationFrame(() => root.classList.add('glide-ready'));
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
        if (ro) ro.observe(root);
        return () => { cancelAnimationFrame(raf); if (ro) ro.disconnect(); };
    }, [activeKey]);
    return ref;
};

const periodLabel = (info) => {
    if (!info) return null;
    if (info.activePeriod) return { text: info.activePeriod.name, tone: info.isBreak ? 'od' : 'present' };
    if (info.isBeforeCollege) return { text: 'Before college', tone: 'neutral' };
    if (info.isAfterCollege) return { text: 'College closed', tone: 'neutral' };
    return null;
};

// Layout: a floating top bar carries the brand, the section tabs and the account menu.
// Each page opens with a header (title, date, one line of context). Phones get a bottom tab bar.
export const AppShell = ({
    user, navItems, menuItems = [], activeNav, onNavigate, onLogout, periodInfo, simulatedTime, setSimulatedTime, children
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const install = useInstallState();
    const topGlider = useGlider(activeNav);
    const tabGlider = useGlider(activeNav);
    const bodyRef = useRef(null);
    const firstPage = useRef(true);

    // Switching sections fades and lifts the new page in. Web Animations on the existing element, so the
    // page is not remounted (a dashboard keeps its state) and only opacity/transform are animated.
    useEffect(() => {
        if (firstPage.current) { firstPage.current = false; return; }
        const el = bodyRef.current;
        if (!el || !el.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        el.animate(
            [{ opacity: 0, transform: 'translate3d(0, 12px, 0)' }, { opacity: 1, transform: 'translate3d(0, 0, 0)' }],
            { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' }
        );
        window.scrollTo({ top: 0 });
    }, [activeNav]);

    useEffect(() => {
        const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        const esc = (e) => e.key === 'Escape' && setMenuOpen(false);
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
    }, []);

    const initial = (user?.name || 'U').trim().charAt(0).toUpperCase();
    const firstName = (user?.name || 'User').trim().split(/\s+/)[0];
    const roleLabel = ROLE_LABEL[user?.role] || user?.role;
    const activeItem = [...navItems, ...menuItems].find((n) => n.id === activeNav) || navItems[0];
    const period = periodLabel(periodInfo);

    return (
        <div className="app">
            <header className="island">
                <div className="island-brand">
                    <div className="sb-logo"><img src="/brand_logo.png" alt="FXEC" /></div>
                    <div className="island-name">
                        <div className="sb-name">AttendOTP</div>
                        <div className="sb-sub">Francis Xavier Engg.</div>
                    </div>
                </div>

                <nav className="island-nav" aria-label="Primary" ref={topGlider}>
                    <span className="glider" aria-hidden="true" />
                    {navItems.map(({ id, label, icon: Icon }) => (
                        <button key={id} type="button" data-active={activeNav === id} aria-current={activeNav === id ? 'page' : undefined}
                            className={`pill-tab ${activeNav === id ? 'is-active' : ''}`} onClick={() => onNavigate(id)}>
                            <Icon size={17} strokeWidth={1.9} />
                            <span>{label}</span>
                        </button>
                    ))}
                </nav>

                <div className="island-right">
                    {period && (
                        <span className={`ui-chip ui-chip--${period.tone} period-chip u-hide-mobile`}>
                            {period.tone === 'present' && <span className="ui-dot ui-dot--live" />}
                            {period.text}
                        </span>
                    )}
                    <Clock simulatedTime={simulatedTime} />

                    <div className="user-menu" ref={menuRef}>
                        <button type="button" className="user-trigger" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen}>
                            <span className="avatar">{initial}</span>
                            <span className="u-hide-mobile">{firstName}</span>
                            <ChevronDown size={15} className="u-hide-mobile" />
                        </button>

                        {menuOpen && (
                            <div className="user-popover" role="menu">
                                <div className="u-row">
                                    <div className="avatar avatar--lg">{initial}</div>
                                    <div className="u-grow">
                                        <div style={{ fontWeight: 800 }} className="u-truncate">{user?.name}</div>
                                        <div className="u-small u-muted u-truncate">{user?.email}</div>
                                        <div className="u-row" style={{ gap: 6, marginTop: 8 }}>
                                            <span className="ui-chip ui-chip--solid">{roleLabel}</span>
                                            {user?.department && <span className="ui-chip">{user.department}</span>}
                                        </div>
                                    </div>
                                </div>

                                {user?.role === 'principal' && setSimulatedTime && (
                                    <>
                                        <hr />
                                        <div className="ui-field">
                                            <label className="ui-label" htmlFor="clock-override">College clock override</label>
                                            <select id="clock-override" className="ui-select" value={simulatedTime || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value || null;
                                                    setSimulatedTime(val);
                                                    try { val ? localStorage.setItem('fxec_simulated_time', val) : localStorage.removeItem('fxec_simulated_time'); } catch (err) { /* ignore */ }
                                                }}>
                                                {CLOCK_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}

                                {user?.role === 'student' && (
                                    <>
                                        <hr />
                                        <AlertsControl variant="menu" />
                                    </>
                                )}

                                {install.available && (
                                    <>
                                        <hr />
                                        <button type="button" className="menu-item" onClick={() => { setMenuOpen(false); promptInstall(); }}>
                                            <Download size={17} strokeWidth={1.85} />Install the app
                                        </button>
                                    </>
                                )}

                                <hr />
                                {menuItems.map(({ id, label, icon: Icon }) => (
                                    <button key={id} type="button" className="menu-item" onClick={() => { setMenuOpen(false); onNavigate(id); }}>
                                        <Icon size={17} strokeWidth={1.85} />{label}
                                    </button>
                                ))}
                                {menuItems.length > 0 && <hr />}
                                <div className="u-row u-small u-muted" style={{ padding: '0 4px 10px' }}>
                                    <ShieldCheck size={16} color="var(--pistachio-600)" />
                                    <span>Account verified</span>
                                </div>
                                <button type="button" className="menu-item menu-item--danger" onClick={() => { setMenuOpen(false); onLogout(); }}>
                                    <LogOut size={17} />Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="stage">
                <div className="stage-body" ref={bodyRef}>
                    <div className="page-head-row">
                        <div>
                            <div className="page-eyebrow">{istDate()}</div>
                            <h1 className="page-title">{activeItem?.label}</h1>
                            {activeItem?.sub && <p className="page-sub">{activeItem.sub}</p>}
                        </div>
                    </div>
                    {children}
                </div>
            </main>

            <nav className="tabbar" aria-label="Primary" ref={tabGlider}>
                <span className="glider" aria-hidden="true" />
                {navItems.map(({ id, label, short, icon: Icon }) => (
                    <button key={id} type="button" data-active={activeNav === id} aria-current={activeNav === id ? 'page' : undefined}
                        className={`tab ${activeNav === id ? 'is-active' : ''}`} onClick={() => onNavigate(id)}>
                        <Icon size={20} strokeWidth={activeNav === id ? 2.3 : 1.9} />
                        <span>{short || label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

