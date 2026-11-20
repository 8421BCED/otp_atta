import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Users, DoorOpen, ShieldCheck, Lock, Unlock, Smartphone, Search, Trophy, Plus, Trash2,
    CalendarPlus, FileText, ChevronRight, Building2, UserCheck, X, Check
} from 'lucide-react';
import { RoomStudentsModal } from './RoomStudentsModal';
import { AttendanceCalendarModal } from './AttendanceCalendarModal';
import { StudentDetailsModal } from './StudentDetailsModal';
import { LeaveReviewModal } from './LeaveReviewModal';
import { StaffDashboard } from './StaffDashboard';
import { Modal, Confirm, Notice, Empty, Stat, SectionHead, Segmented, IconTile, ICON_STROKE } from './kit';
import { usePolling, useNotice } from '../hooks';

const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

const OD_CATEGORIES = [
    'Department Hackathon', 'Inter-College Symposium', 'Project Expo & Presentation',
    'Industrial Visit (IV)', 'Placement Drive / Interview', 'General Academic OD'
];

export const HODDashboard = ({ currentUser, hierarchy, currentPeriodInfo, section = 'home', onNavigate }) => {
    const department = currentUser?.department || 'IT';

    const [overview, setOverview] = useState(null);
    const [students, setStudents] = useState([]);
    const [locked, setLocked] = useState([]);
    const [passes, setPasses] = useState([]);
    const [pendingLeave, setPendingLeave] = useState(0);

    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [approvalsTab, setApprovalsTab] = useState('leave');

    const [notice, showNotice] = useNotice();
    const [confirm, setConfirm] = useState(null); // { title, body, label, tone, run }
    const [busy, setBusy] = useState(false);

    const [inspectedRoom, setInspectedRoom] = useState(null);
    const [studentForCalendar, setStudentForCalendar] = useState(null);
    const [inspectedStudentId, setInspectedStudentId] = useState(null);

    // Holiday
    const [holiday, setHoliday] = useState({ title: '', date: '', reason: 'Department event', timed: false, start: '09:00', end: '12:30' });

    // OD pass form
    const emptyOd = { name: '', category: OD_CATEGORIES[0], venue: 'FXEC Campus', from: todayStr(), to: todayStr(), allDay: true, fromP: 1, toP: 7, reason: '' };
    const [odOpen, setOdOpen] = useState(false);
    const [od, setOd] = useState(emptyOd);
    const [odSearch, setOdSearch] = useState('');
    const [odSelected, setOdSelected] = useState([]);
    const [odBusy, setOdBusy] = useState(false);

    const loadAll = useCallback(async () => {
        try {
            const [ov, st, lk, ps, lv] = await Promise.all([
                fetch('/api/hod/overview').then((r) => r.json()),
                fetch('/api/hod/students?q=').then((r) => r.json()),
                fetch('/api/hod/locked-students').then((r) => r.json()),
                fetch('/api/sports/passes').then((r) => r.json()),
                fetch(`/api/leave/hod-requests?department=${encodeURIComponent(department)}`).then((r) => r.json())
            ]);
            setOverview(ov);
            setStudents(st.students || []);
            setLocked(lk.lockedStudents || []);
            setPasses(ps.passes || []);
            setPendingLeave((lv.requests || []).filter((r) => r.status === 'pending_hod').length);
        } catch (e) {
            console.error('Failed to load HOD data:', e);
        }
    }, [department]);

    usePolling(loadAll, 15000, section !== 'live');

    const lockMap = useMemo(() => new Map(locked.map((l) => [l.id, l])), [locked]);
    const lockedPending = locked.filter((l) => !l.isHodUnlocked).length;

    const post = async (url, body, okText) => {
        setBusy(true);
        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (res.ok && data.success !== false) {
                showNotice({ type: 'success', text: data.message || okText });
                loadAll();
            } else {
                showNotice({ type: 'error', text: data.error || 'That did not work' });
            }
        } catch (e) {
            showNotice({ type: 'error', text: 'Server connection error' });
        } finally {
            setBusy(false);
            setConfirm(null);
        }
    };

    const unlockDay = (st) => post('/api/hod/unlock-student-day', { studentId: st.id }, `Attendance unlocked for ${st.name}`);
    const askRelock = (st) => setConfirm({
        title: 'Lock attendance again?', body: `${st.name} will not be able to enter codes for the rest of today.`, label: 'Lock again', tone: 'danger',
        run: () => post('/api/hod/relock-student-day', { studentId: st.id }, `Attendance locked for ${st.name}`)
    });
    const askResetDevice = (st) => setConfirm({
        title: 'Reset device binding?', body: `${st.name} will be able to register a new phone the next time they sign in. Their current phone stops working for attendance.`,
        label: 'Reset device', tone: 'danger',
        run: () => post('/api/hod/reset-device-lock', { studentId: st.id }, `Device reset for ${st.name}`)
    });
    const askRevokePass = (p) => setConfirm({
        title: 'Revoke this pass?', body: `Students on "${p.event_name}" lose their On-Duty credit from this pass.`, label: 'Revoke pass', tone: 'danger',
        run: async () => {
            setBusy(true);
            try {
                const res = await fetch(`/api/sports/passes/${p.id}`, { method: 'DELETE' });
                const data = await res.json();
                showNotice({ type: res.ok ? 'success' : 'error', text: data.message || data.error });
                loadAll();
            } catch (e) { showNotice({ type: 'error', text: 'Server connection error' }); } finally { setBusy(false); setConfirm(null); }
        }
    });

    const declareHoliday = async (e) => {
        e.preventDefault();
        if (!holiday.title || !holiday.date) return;
        try {
            const res = await fetch('/api/holidays/declare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: holiday.title, holiday_date: holiday.date, scope: 'department', department, reason: holiday.reason,
                    is_timed: holiday.timed ? 1 : 0,
                    start_time: holiday.timed ? `${holiday.start}:00` : null,
                    end_time: holiday.timed ? `${holiday.end}:00` : null
                })
            });
            const data = await res.json();
            showNotice({ type: res.ok ? 'success' : 'error', text: data.message || data.error || 'Could not save' });
            if (res.ok) setHoliday((h) => ({ ...h, title: '', date: '' }));
        } catch (err) {
            showNotice({ type: 'error', text: 'Server connection error' });
        }
    };

    const submitOd = async (e) => {
        e.preventDefault();
        if (!od.name.trim()) return showNotice({ type: 'error', text: 'Give the event a title.' });
        if (odSelected.length === 0) return showNotice({ type: 'error', text: 'Select at least one student.' });
        setOdBusy(true);
        try {
            const res = await fetch('/api/sports/passes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_name: od.name.trim(), sport_category: od.category, venue: od.venue.trim(),
                    from_date: od.from, to_date: od.to, is_all_day: od.allDay,
                    from_period: od.allDay ? 1 : Number(od.fromP), to_period: od.allDay ? 7 : Number(od.toP),
                    reason: od.reason.trim(), student_ids: odSelected.map((s) => ({ id: s.id, notes: 'HOD approved OD' }))
                })
            });
            const data = await res.json();
            if (res.ok) {
                showNotice({ type: 'success', text: data.message });
                setOdOpen(false); setOd(emptyOd); setOdSelected([]); setOdSearch('');
                loadAll();
            } else {
                showNotice({ type: 'error', text: data.error || 'Could not issue the pass' });
            }
        } catch (err) {
            showNotice({ type: 'error', text: 'Server connection error' });
        } finally {
            setOdBusy(false);
        }
    };

    // ------------------------------------------------------------ sections
    const roomsInUse = overview?.roomDistribution || [];

    const overviewView = (
        <div className="stack">
            <Notice notice={notice} />
            <div className="stat-grid">
                <Stat icon={Users} label="Students enrolled" value={overview?.totalStudents ?? '-'} hint={`${department} department`} />
                <Stat icon={UserCheck} tone="pistachio" label="Present today" value={overview?.presentToday ?? '-'} hint={`${overview?.attendanceRate ?? 0}% of the department`} />
                <Stat icon={DoorOpen} label="Rooms in use" value={roomsInUse.length} />
                <Stat icon={Lock} tone={lockedPending ? 'danger' : 'neutral'} label="Locked out" value={lockedPending} hint={lockedPending ? 'Waiting for your unlock' : 'Nobody locked'} />
            </div>

            {(pendingLeave > 0 || lockedPending > 0) && (
                <div className="split split--even">
                    {pendingLeave > 0 && (
                        <button type="button" className="pick-item" onClick={() => { setApprovalsTab('leave'); onNavigate && onNavigate('approvals'); }}>
                            <IconTile icon={FileText} tone="warn" size={44} />
                            <div className="u-grow"><div className="pick-name">{pendingLeave} leave request{pendingLeave > 1 ? 's' : ''} waiting</div><div className="pick-sub">Review and approve On-Duty credit</div></div>
                            <ChevronRight size={18} color="var(--ink-3)" />
                        </button>
                    )}
                    {lockedPending > 0 && (
                        <button type="button" className="pick-item" onClick={() => { setFilter('day_locked'); onNavigate && onNavigate('students'); }}>
                            <IconTile icon={Lock} tone="danger" size={44} />
                            <div className="u-grow"><div className="pick-name">{lockedPending} student{lockedPending > 1 ? 's' : ''} locked out</div><div className="pick-sub">Missed a day cutoff</div></div>
                            <ChevronRight size={18} color="var(--ink-3)" />
                        </button>
                    )}
                </div>
            )}

            <div className="split split--even">
                <section className="ui-card">
                    <SectionHead icon={Building2} title="Rooms in use" sub="Tap a room to see who is in it" />
                    {roomsInUse.length > 0 ? (
                        <div className="pick-list" style={{ maxHeight: 360 }}>
                            {roomsInUse.map((r) => (
                                <button key={r.room_id} type="button" className="pick-item" onClick={() => setInspectedRoom(r)}>
                                    <IconTile icon={DoorOpen} size={40} />
                                    <div className="u-grow"><div className="pick-name">Room {r.room_number}</div><div className="pick-sub u-truncate">{r.room_name}, {r.building_name}</div></div>
                                    <span className="ui-chip ui-chip--present">{r.student_count}</span>
                                </button>
                            ))}
                        </div>
                    ) : <Empty icon={DoorOpen} title="No rooms in use">Rooms appear here once students check in.</Empty>}
                </section>

                <section className="ui-card">
                    <SectionHead icon={CalendarPlus} title="Declare a holiday" sub="Applies to your department only" />
                    <form onSubmit={declareHoliday} className="u-col" style={{ gap: 14 }}>
                        <Segmented label="Type" value={holiday.timed ? 'timed' : 'full'} onChange={(v) => setHoliday((h) => ({ ...h, timed: v === 'timed' }))}
                            options={[{ value: 'full', label: 'Full day' }, { value: 'timed', label: 'Timed event' }]} />
                        <div className="ui-field">
                            <label className="ui-label" htmlFor="hol-title">Title</label>
                            <input id="hol-title" className="ui-input" placeholder="e.g. Rainy day, Symposium" value={holiday.title} onChange={(e) => setHoliday((h) => ({ ...h, title: e.target.value }))} required />
                        </div>
                        <div className="ui-field">
                            <label className="ui-label" htmlFor="hol-date">Date</label>
                            <input id="hol-date" type="date" className="ui-input" value={holiday.date} onChange={(e) => setHoliday((h) => ({ ...h, date: e.target.value }))} required />
                        </div>
                        {holiday.timed && (
                            <div className="split split--even" style={{ gap: 14 }}>
                                <div className="ui-field"><label className="ui-label" htmlFor="hol-s">From</label><input id="hol-s" type="time" className="ui-input" value={holiday.start} onChange={(e) => setHoliday((h) => ({ ...h, start: e.target.value }))} /></div>
                                <div className="ui-field"><label className="ui-label" htmlFor="hol-e">To</label><input id="hol-e" type="time" className="ui-input" value={holiday.end} onChange={(e) => setHoliday((h) => ({ ...h, end: e.target.value }))} /></div>
                            </div>
                        )}
                        <button type="submit" className="ui-btn ui-btn--primary"><CalendarPlus size={18} />Save holiday</button>
                    </form>
                </section>
            </div>
        </div>
    );

    const approvalsView = (
        <div className="stack">
            <Notice notice={notice} />
            <Segmented label="Approvals" value={approvalsTab} onChange={setApprovalsTab}
                options={[{ value: 'leave', label: 'Leave requests', count: pendingLeave }, { value: 'od', label: 'On-Duty passes', count: passes.length }]} />

            {approvalsTab === 'leave' ? (
                <LeaveReviewModal inline role="hod" department={department} />
            ) : (
                <section className="ui-card">
                    <SectionHead icon={Trophy} tone="warn" title="On-Duty passes" sub="Credit On-Duty attendance for events, visits and projects"
                        right={<button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => setOdOpen(true)}><Plus size={16} />Issue pass</button>} />
                    {passes.length > 0 ? (
                        <div className="ui-table-wrap table-scroll">
                            <table className="ui-table">
                                <thead><tr><th>Event</th><th>Dates</th><th>Students</th><th /></tr></thead>
                                <tbody>
                                    {passes.map((p) => (
                                        <tr key={p.id}>
                                            <td><div className="cell-strong">{p.event_name}</div><div className="cell-sub">{p.sport_category}, {p.venue}</div></td>
                                            <td className="mono">{p.from_date} to {p.to_date}</td>
                                            <td><span className="ui-chip">{p.student_count}</span></td>
                                            <td style={{ textAlign: 'right' }}><button type="button" className="ui-btn ui-btn--danger ui-btn--sm" onClick={() => askRevokePass(p)}><Trash2 size={15} />Revoke</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <Empty icon={Trophy} title="No passes issued">Issue a pass to credit On-Duty attendance to a group of students.</Empty>}
                </section>
            )}
        </div>
    );

    const q = query.trim().toLowerCase();
    const shown = students.filter((st) => {
        if (filter === 'day_locked' && !lockMap.has(st.id)) return false;
        if (filter === 'device' && !st.device_name) return false;
        if (q && !`${st.name} ${st.email} ${st.roll_number || ''}`.toLowerCase().includes(q)) return false;
        return true;
    });

    const studentsView = (
        <div className="stack">
            <Notice notice={notice} />
            <section className="ui-card">
                <SectionHead icon={ShieldCheck} title="Students and locks" sub="Unlock missed cutoffs and reset phones" />
                <div className="toolbar">
                    <div className="search-bar">
                        <Search size={18} />
                        <input className="ui-input" placeholder="Search by name, email or roll number" value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                    <Segmented label="Filter" value={filter} onChange={setFilter}
                        options={[
                            { value: 'all', label: 'All', count: students.length },
                            { value: 'day_locked', label: 'Locked', count: locked.length },
                            { value: 'device', label: 'Has device', count: students.filter((s) => s.device_name).length }
                        ]} />
                </div>

                {shown.length > 0 ? (
                    <div className="ui-table-wrap table-scroll" style={{ maxHeight: 620 }}>
                        <table className="ui-table">
                            <thead><tr><th>Student</th><th>Today</th><th>Attendance</th><th>Device</th><th /></tr></thead>
                            <tbody>
                                {shown.map((st) => {
                                    const lock = lockMap.get(st.id);
                                    return (
                                        <tr key={st.id}>
                                            <td className="row-click" onClick={() => setStudentForCalendar(st)}>
                                                <div className="cell-strong">{st.name}</div>
                                                <div className="cell-sub">{st.roll_number || st.email}</div>
                                            </td>
                                            <td>
                                                {st.current_room
                                                    ? <><div className="cell-strong">Room {st.current_room}</div><div className="cell-sub">{st.periods_attended} of 7 periods</div></>
                                                    : <span className="u-faint">Not in class</span>}
                                            </td>
                                            <td>
                                                {lock
                                                    ? (lock.isHodUnlocked
                                                        ? <span className="ui-chip ui-chip--present"><Check size={13} />Unlocked</span>
                                                        : <span className="ui-chip ui-chip--danger"><Lock size={13} />{lock.lockType}</span>)
                                                    : <span className="ui-chip ui-chip--neutral">Normal</span>}
                                            </td>
                                            <td>{st.device_name ? <span className="ui-chip"><Smartphone size={13} />{st.device_name}</span> : <span className="u-faint">None</span>}</td>
                                            <td>
                                                <div className="u-row" style={{ gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                    {lock && !lock.isHodUnlocked && <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => unlockDay(st)}><Unlock size={15} />Unlock day</button>}
                                                    {lock && lock.isHodUnlocked && <button type="button" className="ui-btn ui-btn--sm" onClick={() => askRelock(st)}><Lock size={15} />Lock again</button>}
                                                    {st.device_name && <button type="button" className="ui-btn ui-btn--sm" onClick={() => askResetDevice(st)}><Smartphone size={15} />Reset phone</button>}
                                                    <button type="button" className="ui-icon-btn" style={{ width: 34, height: 34, borderRadius: 11 }} onClick={() => setInspectedStudentId(st.id)} aria-label="Student profile"><ChevronRight size={17} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : <Empty icon={Users} title="No students match">Try a different search or filter.</Empty>}
            </section>
        </div>
    );

    const odStudents = students.filter((s) => {
        if (odSelected.some((x) => x.id === s.id)) return false;
        const t = odSearch.trim().toLowerCase();
        return !t || `${s.name} ${s.email} ${s.roll_number || ''}`.toLowerCase().includes(t);
    });

    const odModal = (
        <Modal open={odOpen} onClose={() => setOdOpen(false)} size="lg" icon={Trophy} tone="warn" title="Issue On-Duty pass"
            subtitle="Selected students get On-Duty credit and do not need a room code"
            footer={(
                <>
                    <button type="button" className="ui-btn" onClick={() => setOdOpen(false)}>Cancel</button>
                    <button type="submit" form="od-form" className="ui-btn ui-btn--primary" disabled={odBusy}>{odBusy ? 'Issuing' : `Issue pass${odSelected.length ? ` (${odSelected.length})` : ''}`}</button>
                </>
            )}>
            <form id="od-form" onSubmit={submitOd} className="u-col" style={{ gap: 16 }}>
                <Notice notice={notice} />
                <div className="split split--even" style={{ gap: 14 }}>
                    <div className="ui-field"><label className="ui-label" htmlFor="od-name">Event title</label><input id="od-name" className="ui-input" value={od.name} onChange={(e) => setOd({ ...od, name: e.target.value })} placeholder="e.g. Smart India Hackathon" required /></div>
                    <div className="ui-field"><label className="ui-label" htmlFor="od-cat">Category</label><select id="od-cat" className="ui-select" value={od.category} onChange={(e) => setOd({ ...od, category: e.target.value })}>{OD_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
                    <div className="ui-field"><label className="ui-label" htmlFor="od-venue">Venue</label><input id="od-venue" className="ui-input" value={od.venue} onChange={(e) => setOd({ ...od, venue: e.target.value })} /></div>
                    <div className="ui-field"><label className="ui-label" htmlFor="od-scope">Scope</label>
                        <select id="od-scope" className="ui-select" value={od.allDay ? 'all' : 'part'} onChange={(e) => setOd({ ...od, allDay: e.target.value === 'all' })}>
                            <option value="all">Full day, all periods</option><option value="part">Specific periods</option>
                        </select></div>
                    <div className="ui-field"><label className="ui-label" htmlFor="od-from">From</label><input id="od-from" type="date" className="ui-input" value={od.from} onChange={(e) => setOd({ ...od, from: e.target.value, to: e.target.value > od.to ? e.target.value : od.to })} required /></div>
                    <div className="ui-field"><label className="ui-label" htmlFor="od-to">To</label><input id="od-to" type="date" className="ui-input" min={od.from} value={od.to} onChange={(e) => setOd({ ...od, to: e.target.value })} required /></div>
                    {!od.allDay && (
                        <>
                            <div className="ui-field"><label className="ui-label" htmlFor="od-fp">From period</label><select id="od-fp" className="ui-select" value={od.fromP} onChange={(e) => setOd({ ...od, fromP: e.target.value })}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>Period {n}</option>)}</select></div>
                            <div className="ui-field"><label className="ui-label" htmlFor="od-tp">To period</label><select id="od-tp" className="ui-select" value={od.toP} onChange={(e) => setOd({ ...od, toP: e.target.value })}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>Period {n}</option>)}</select></div>
                        </>
                    )}
                </div>
                <div className="ui-field"><label className="ui-label" htmlFor="od-reason">Reason (optional)</label><input id="od-reason" className="ui-input" value={od.reason} onChange={(e) => setOd({ ...od, reason: e.target.value })} /></div>

                <div className="ui-field">
                    <div className="ui-label">Students ({odSelected.length} selected)</div>
                    {odSelected.length > 0 && (
                        <div className="u-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                            {odSelected.map((s) => (
                                <button key={s.id} type="button" className="ui-chip ui-chip--solid" style={{ border: 0, cursor: 'pointer', height: 30 }} onClick={() => setOdSelected((p) => p.filter((x) => x.id !== s.id))}>
                                    {s.name}<X size={13} />
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="search-bar" style={{ marginTop: 8 }}><Search size={18} /><input className="ui-input" placeholder="Search students to add" value={odSearch} onChange={(e) => setOdSearch(e.target.value)} /></div>
                    <div className="pick-list" style={{ maxHeight: 220 }}>
                        {odStudents.slice(0, 40).map((s) => (
                            <button key={s.id} type="button" className="pick-item" onClick={() => setOdSelected((p) => [...p, s])}>
                                <div className="u-grow"><div className="pick-name">{s.name}</div><div className="pick-sub">{s.roll_number || s.email}</div></div>
                                <Plus size={18} color="var(--denim-500)" />
                            </button>
                        ))}
                        {odStudents.length === 0 && <div className="u-muted u-small" style={{ padding: 8 }}>No more students to add.</div>}
                    </div>
                </div>
            </form>
        </Modal>
    );

    return (
        <>
            {section === 'live' ? (
                <StaffDashboard currentUser={currentUser} hierarchy={hierarchy} currentPeriodInfo={currentPeriodInfo} section="home" />
            ) : section === 'approvals' ? approvalsView : section === 'students' ? studentsView : overviewView}

            <RoomStudentsModal isOpen={!!inspectedRoom} onClose={() => setInspectedRoom(null)} roomId={inspectedRoom?.room_id} roomName={inspectedRoom?.room_name} buildingName={inspectedRoom?.building_name} />
            <AttendanceCalendarModal isOpen={!!studentForCalendar} onClose={() => setStudentForCalendar(null)} student={studentForCalendar} />
            <StudentDetailsModal isOpen={!!inspectedStudentId} onClose={() => setInspectedStudentId(null)} studentId={inspectedStudentId} />
            {odModal}
            <Confirm open={!!confirm} title={confirm?.title} confirmLabel={confirm?.label} tone={confirm?.tone} busy={busy} onConfirm={() => confirm?.run()} onCancel={() => setConfirm(null)}>
                {confirm?.body}
            </Confirm>
        </>
    );
};
