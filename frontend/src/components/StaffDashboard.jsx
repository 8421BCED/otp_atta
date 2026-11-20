import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, RefreshCw, Radio, DoorOpen, Camera, ShieldCheck, ShieldAlert, Building2, Search,
    FileText, AlertTriangle, ChevronRight, Eye
} from 'lucide-react';
import { RoomSelectionModal } from './RoomSelectionModal';
import { RoomStudentsModal } from './RoomStudentsModal';
import { AttendanceCalendarModal } from './AttendanceCalendarModal';
import { ClassroomHeadcountModal } from './ClassroomHeadcountModal';
import { LeaveReviewModal } from './LeaveReviewModal';
import { IconTile, Empty, Segmented, SectionHead, timeOf, ICON_STROKE } from './kit';
import { usePolling } from '../hooks';

const OTP_SECONDS = 10;

export const StaffDashboard = ({ currentUser, hierarchy, currentPeriodInfo, section = 'home' }) => {
    const [selectedRoomId, setSelectedRoomId] = useState(() => {
        try { return localStorage.getItem(`fxec_staff_room_${currentUser?.id}`) || null; } catch (e) { return null; }
    });
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [isHeadcountModalOpen, setIsHeadcountModalOpen] = useState(false);

    const [activeRooms, setActiveRooms] = useState([]);
    const [inspectedRoom, setInspectedRoom] = useState(null);
    const [studentForCalendar, setStudentForCalendar] = useState(null);

    const [currentOtp, setCurrentOtp] = useState('');
    const [secondsLeft, setSecondsLeft] = useState(OTP_SECONDS);
    const [autoRegen, setAutoRegen] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [otpError, setOtpError] = useState(null);

    const [presentCount, setPresentCount] = useState(0);
    const [roomStudents, setRoomStudents] = useState([]);
    const [roomInfo, setRoomInfo] = useState(null);
    const [latestAudit, setLatestAudit] = useState(null);

    const [students, setStudents] = useState([]);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');

    const periodId = currentPeriodInfo?.activePeriod?.id;

    const generateNewOtp = useCallback(async () => {
        if (!selectedRoomId) return;
        setIsGenerating(true);
        try {
            const res = await fetch('/api/attendance/generate-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: selectedRoomId, periodId: periodId || 1 })
            });
            const data = await res.json();
            if (data.otpCode) {
                setCurrentOtp(data.otpCode);
                setSecondsLeft(OTP_SECONDS);
                setOtpError(null);
            } else {
                setCurrentOtp('');
                setOtpError(data.error || 'Could not generate a code');
                if (data.windowExpired) setAutoRegen(false);
            }
        } catch (e) {
            setOtpError('Could not reach the server');
        } finally {
            setIsGenerating(false);
        }
    }, [selectedRoomId, periodId]);

    // Countdown and automatic rollover
    useEffect(() => {
        if (!selectedRoomId) return undefined;
        const timer = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    if (autoRegen) generateNewOtp();
                    return OTP_SECONDS;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [selectedRoomId, autoRegen, generateNewOtp]);

    const fetchLatestAudit = useCallback(async (roomId) => {
        if (!roomId) { setLatestAudit(null); return; }
        try {
            const res = await fetch(`/api/headcount/latest/${roomId}`);
            const data = await res.json();
            setLatestAudit(data.hasAudit ? data.audit : null);
        } catch (e) { /* keep previous */ }
    }, []);

    const fetchRoster = useCallback(async () => {
        if (!selectedRoomId) return;
        try {
            const res = await fetch(`/api/attendance/room-live-roster/${selectedRoomId}`);
            const data = await res.json();
            if (data.room) {
                setRoomInfo(data.room);
                setPresentCount(data.presentCount || 0);
                setRoomStudents(data.students || []);
            }
        } catch (e) { /* keep previous */ }
    }, [selectedRoomId]);

    // Choosing or clearing a room
    useEffect(() => {
        if (selectedRoomId) {
            try { localStorage.setItem(`fxec_staff_room_${currentUser?.id}`, selectedRoomId); } catch (e) { /* ignore */ }
            setAutoRegen(true);
            generateNewOtp();
            fetchLatestAudit(selectedRoomId);
        } else {
            try { localStorage.removeItem(`fxec_staff_room_${currentUser?.id}`); } catch (e) { /* ignore */ }
            setCurrentOtp('');
            setRoomInfo(null);
            setPresentCount(0);
            setRoomStudents([]);
            setLatestAudit(null);
        }
    }, [selectedRoomId, currentUser?.id]);

    usePolling(fetchRoster, 3000, !!selectedRoomId && section === 'home');

    const fetchActiveRooms = useCallback(async () => {
        try {
            const res = await fetch('/api/hod/overview');
            const data = await res.json();
            if (data.roomDistribution) setActiveRooms(data.roomDistribution);
        } catch (e) { /* keep previous */ }
    }, []);
    usePolling(fetchActiveRooms, 10000, section === 'home' || section === 'students');

    const searchStudents = useCallback(async (q) => {
        try {
            const res = await fetch(`/api/hod/students?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            setStudents(data.students || []);
        } catch (e) { /* keep previous */ }
    }, []);

    useEffect(() => {
        if (section !== 'students') return undefined;
        const t = setTimeout(() => searchStudents(query), 250);
        return () => clearTimeout(t);
    }, [query, section, searchStudents]);

    // ---------------------------------------------------------------- views
    const digits = (currentOtp || '------').split('');
    const low = secondsLeft <= 3;
    const auditOk = latestAudit?.match_status === 'verified';

    const liveClass = (
        <div className="stack">
            {/* Console: built to be read from across a classroom */}
            <section className="console">
                <div className="console-top">
                    <div className="u-row" style={{ gap: 12 }}>
                        <span className="console-icon"><Radio size={20} strokeWidth={ICON_STROKE} /></span>
                        <div>
                            <div className="console-room">
                                {roomInfo ? `Room ${roomInfo.room_number}, ${roomInfo.building_name}` : 'No classroom selected'}
                            </div>
                            <div className="console-sub">
                                {roomInfo ? `${roomInfo.floor_name}, ${roomInfo.name}` : 'Choose the room you are teaching in to start the rolling code'}
                            </div>
                        </div>
                    </div>
                    <div className="u-row" style={{ gap: 10, flexWrap: 'wrap' }}>
                        <label className="console-toggle">
                            Auto refresh
                            <span className="switch">
                                <input type="checkbox" checked={autoRegen} onChange={(e) => setAutoRegen(e.target.checked)} disabled={!selectedRoomId} />
                                <i />
                            </span>
                        </label>
                        <button type="button" className="console-btn" onClick={() => setIsRoomModalOpen(true)}>
                            <DoorOpen size={17} strokeWidth={ICON_STROKE} />
                            {selectedRoomId ? 'Change room' : 'Choose room'}
                        </button>
                    </div>
                </div>

                {selectedRoomId ? (
                    <div className="console-body">
                        <div className="console-code">
                            <div className="console-label">Room code</div>
                            <div className="console-digits" aria-live="polite" aria-label={`Room code ${currentOtp || 'not available'}`}>
                                {digits.map((d, i) => <span key={i} className="console-digit">{d}</span>)}
                            </div>
                            <div className={`console-bar ${low ? 'is-low' : ''}`}><span style={{ width: `${(secondsLeft / OTP_SECONDS) * 100}%` }} /></div>
                            <div className="console-meta">
                                <span>Changes in {secondsLeft}s</span>
                                <button type="button" className="console-btn console-btn--ghost" onClick={generateNewOtp} disabled={isGenerating}>
                                    <RefreshCw size={15} className={isGenerating ? 'spin' : ''} />New code
                                </button>
                            </div>
                            {otpError && <div className="console-error"><AlertTriangle size={16} />{otpError}</div>}
                        </div>

                        <div className="console-count">
                            <div className="console-label">Present now</div>
                            <div className="console-number">{presentCount}</div>
                            <button type="button" className="console-btn" onClick={() => setIsHeadcountModalOpen(true)}>
                                <Camera size={16} strokeWidth={ICON_STROKE} />AI headcount
                            </button>
                            {latestAudit && (
                                <button type="button" className={`console-audit ${auditOk ? '' : 'is-bad'}`} onClick={() => setIsHeadcountModalOpen(true)}>
                                    {auditOk ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
                                    {latestAudit.visual_count} seen, {latestAudit.otp_count} codes
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="console-empty">
                        <DoorOpen size={30} strokeWidth={1.6} />
                        <div>The code stays locked until you choose your classroom.</div>
                    </div>
                )}
            </section>
                {/* Roster */}
                <section className="ui-card">
                    <SectionHead
                        icon={Users}
                        title={roomInfo ? `Live roster, Room ${roomInfo.room_number}` : 'Live roster'}
                        sub="Updates as students enter the code"
                        right={selectedRoomId && (
                            <button type="button" className="ui-btn ui-btn--sm" onClick={() => setIsHeadcountModalOpen(true)}>
                                <Camera size={16} strokeWidth={ICON_STROKE} />
                                AI headcount
                            </button>
                        )}
                    />

                    {selectedRoomId ? (
                        <>
                            <div className="u-row u-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 14 }}>
                                <div className="count-hero"><strong>{presentCount}</strong><span className="u-muted">present now</span></div>
                                {latestAudit && (
                                    <button
                                        type="button"
                                        className={`ui-chip ${auditOk ? 'ui-chip--present' : 'ui-chip--danger'}`}
                                        style={{ height: 34, cursor: 'pointer', border: 0 }}
                                        onClick={() => setIsHeadcountModalOpen(true)}
                                    >
                                        {auditOk ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
                                        {latestAudit.visual_count} seen, {latestAudit.otp_count} codes
                                    </button>
                                )}
                            </div>

                            {roomStudents.length > 0 ? (
                                <div className="ui-table-wrap table-scroll">
                                    <table className="ui-table">
                                        <thead><tr><th>Student</th><th>Dept</th><th>Time</th></tr></thead>
                                        <tbody>
                                            {roomStudents.map((st) => (
                                                <tr key={st.student_id}>
                                                    <td><div className="cell-strong">{st.name}</div><div className="cell-sub">{st.email}</div></td>
                                                    <td>{st.department}</td>
                                                    <td className="mono">{timeOf(st.marked_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <Empty icon={Users} title="No one yet">Students will appear here after they enter the code.</Empty>
                            )}
                        </>
                    ) : (
                        <Empty icon={Users} title="Waiting for a classroom">Pick your room to see who has checked in.</Empty>
                    )}
                </section>

            <section className="ui-card">
                <SectionHead icon={Building2} title="Rooms in use" sub={`Department ${currentUser?.department || ''}, tap a room to see who is in it`} />
                {activeRooms.length > 0 ? (
                    <div className="pick-list" style={{ maxHeight: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                        {activeRooms.map((r) => (
                            <button key={r.room_id} type="button" className="pick-item" onClick={() => setInspectedRoom(r)}>
                                <IconTile icon={DoorOpen} size={40} />
                                <div className="u-grow">
                                    <div className="pick-name">Room {r.room_number}</div>
                                    <div className="pick-sub u-truncate">{r.building_name}</div>
                                </div>
                                <span className="ui-chip ui-chip--present"><Eye size={13} />{r.student_count}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <Empty icon={Building2} title="No rooms in use right now">Rooms appear here when students check in.</Empty>
                )}
            </section>
        </div>
    );

    const countPresent = students.filter((s) => s.current_room && s.periods_attended > 0).length;
    const countPending = students.length - countPresent;
    const filtered = students.filter((s) => {
        if (filter === 'present') return s.current_room && s.periods_attended > 0;
        if (filter === 'pending') return !s.current_room || s.periods_attended === 0;
        return true;
    });

    const studentsView = (
        <section className="ui-card">
            <SectionHead icon={Users} title="Department students" sub="Open a student to see their calendar and daily rooms" />
            <div className="toolbar">
                <div className="search-bar">
                    <Search size={18} />
                    <input className="ui-input" placeholder="Search by name, email or roll number" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <Segmented
                    label="Filter"
                    value={filter}
                    onChange={setFilter}
                    options={[
                        { value: 'all', label: 'All', count: students.length },
                        { value: 'present', label: 'In class', count: countPresent },
                        { value: 'pending', label: 'Not in', count: countPending }
                    ]}
                />
            </div>

            {filtered.length > 0 ? (
                <div className="ui-table-wrap table-scroll" style={{ maxHeight: 560 }}>
                    <table className="ui-table">
                        <thead><tr><th>Student</th><th>Current room</th><th>Periods</th><th /></tr></thead>
                        <tbody>
                            {filtered.map((st) => (
                                <tr key={st.id} className="row-click" onClick={() => setStudentForCalendar(st)}>
                                    <td><div className="cell-strong">{st.name}</div><div className="cell-sub">{st.email}</div></td>
                                    <td>
                                        {st.current_room
                                            ? <><div className="cell-strong">Room {st.current_room}</div><div className="cell-sub">{st.current_building}</div></>
                                            : <span className="u-faint">Not checked in</span>}
                                    </td>
                                    <td><span className={`ui-chip ${st.periods_attended > 0 ? 'ui-chip--present' : 'ui-chip--neutral'}`}>{st.periods_attended} / 7</span></td>
                                    <td style={{ textAlign: 'right' }}><ChevronRight size={18} color="var(--ink-3)" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <Empty icon={Users} title="No students match">Try a different search or filter.</Empty>
            )}
        </section>
    );

    return (
        <>
            {section === 'students' ? studentsView : section === 'leave' ? (
                <LeaveReviewModal inline role="staff" department={currentUser?.department || 'IT'} />
            ) : liveClass}

            <RoomSelectionModal
                isOpen={isRoomModalOpen}
                onClose={() => setIsRoomModalOpen(false)}
                hierarchy={hierarchy}
                onSelectRoom={(bId, fId, rId) => setSelectedRoomId(String(rId))}
                currentRoomId={selectedRoomId ? Number(selectedRoomId) : null}
            />
            <RoomStudentsModal
                isOpen={!!inspectedRoom}
                onClose={() => setInspectedRoom(null)}
                roomId={inspectedRoom?.room_id}
                roomName={inspectedRoom?.room_name}
                buildingName={inspectedRoom?.building_name}
            />
            <AttendanceCalendarModal
                isOpen={!!studentForCalendar}
                onClose={() => setStudentForCalendar(null)}
                student={studentForCalendar}
            />
            <ClassroomHeadcountModal
                isOpen={isHeadcountModalOpen}
                onClose={() => setIsHeadcountModalOpen(false)}
                roomId={selectedRoomId}
                roomNumber={roomInfo?.room_number}
                roomName={roomInfo?.name}
                periodId={periodId || 1}
                otpPresentCount={presentCount}
                onAuditSaved={() => fetchLatestAudit(selectedRoomId)}
            />
        </>
    );
};

