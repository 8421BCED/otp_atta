import React, { useState, useEffect } from 'react';
import { Users, RotateCcw, Calendar, CheckCircle2, Search, Building2, Clock, Lock, Unlock, Eye, Sparkles, QrCode, RefreshCw, DoorOpen, Radio } from 'lucide-react';
import { RoomStudentsModal } from './RoomStudentsModal';
import { AttendanceCalendarModal } from './AttendanceCalendarModal';
import { StudentDetailsModal } from './StudentDetailsModal';
import { RoomSelectionModal } from './RoomSelectionModal';

export const HODDashboard = ({ currentUser, hierarchy }) => {
    const department = currentUser?.department || 'IT';

    const [overview, setOverview] = useState(null);
    const [students, setStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [lockedOnlyFilter, setLockedOnlyFilter] = useState(false);
    const [resetNotice, setResetNotice] = useState(null);

    // Active room popup state
    const [selectedActiveRoom, setSelectedActiveRoom] = useState(null);

    // Student Calendar Modal state
    const [selectedStudentForCalendar, setSelectedStudentForCalendar] = useState(null);

    // Inspected student modal state
    const [inspectedStudentId, setInspectedStudentId] = useState(null);

    // HOD Faculty Teaching Session & Live OTP State
    const [teachingRoomId, setTeachingRoomId] = useState(null);
    const [isTeachingRoomModalOpen, setIsTeachingRoomModalOpen] = useState(false);
    const [teachingOtp, setTeachingOtp] = useState('------');
    const [teachingSecondsLeft, setTeachingSecondsLeft] = useState(10);
    const [teachingAutoRegen, setTeachingAutoRegen] = useState(true);
    const [isGeneratingTeachingOtp, setIsGeneratingTeachingOtp] = useState(false);
    const [teachingRoomInfo, setTeachingRoomInfo] = useState(null);
    const [teachingPresentCount, setTeachingPresentCount] = useState(0);
    const [teachingRoomStudents, setTeachingRoomStudents] = useState([]);

    // Holiday & Timed Event Exemption declaration state
    const [holidayTitle, setHolidayTitle] = useState('');
    const [holidayDate, setHolidayDate] = useState('');
    const [holidayReason, setHolidayReason] = useState('Department Institutional Event');
    const [isTimed, setIsTimed] = useState(false);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('12:30');
    const [holidayNotice, setHolidayNotice] = useState(null);

    // Generate 10-Second OTP for HOD's Teaching Room
    const generateTeachingOtp = async () => {
        if (!teachingRoomId) return;
        setIsGeneratingTeachingOtp(true);
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('http://localhost:5000/api/attendance/generate-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    roomId: teachingRoomId,
                    periodId: 1
                })
            });
            const data = await res.json();
            if (data.otpCode) {
                setTeachingOtp(data.otpCode);
                setTeachingSecondsLeft(10);
            }
        } catch (e) {
            console.error('Failed to generate HOD teaching OTP:', e);
        } finally {
            setIsGeneratingTeachingOtp(false);
        }
    };

    // HOD 10s Timer Countdown
    useEffect(() => {
        if (!teachingRoomId) return;
        const timer = setInterval(() => {
            setTeachingSecondsLeft(prev => {
                if (prev <= 1) {
                    if (teachingAutoRegen) {
                        generateTeachingOtp();
                    }
                    return 10;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [teachingRoomId, teachingAutoRegen]);

    // Live Teaching Room Roster Polling
    const fetchTeachingRoster = async () => {
        if (!teachingRoomId) return;
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch(`http://localhost:5000/api/attendance/room-live-roster/${teachingRoomId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.room) {
                setTeachingRoomInfo(data.room);
                setTeachingPresentCount(data.presentCount || 0);
                setTeachingRoomStudents(data.students || []);
            }
        } catch (e) {
            console.error('Failed to fetch teaching room roster:', e);
        }
    };

    useEffect(() => {
        if (teachingRoomId) {
            generateTeachingOtp();
            fetchTeachingRoster();
            const poll = setInterval(fetchTeachingRoster, 2000);
            return () => clearInterval(poll);
        } else {
            setTeachingOtp('------');
            setTeachingRoomInfo(null);
            setTeachingPresentCount(0);
            setTeachingRoomStudents([]);
        }
    }, [teachingRoomId]);

    const loadHODData = async () => {
        try {
            const token = localStorage.getItem('fxec_token');
            const [resOverview, resStudents] = await Promise.all([
                fetch('http://localhost:5000/api/hod/overview', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`http://localhost:5000/api/hod/students?q=${encodeURIComponent(searchQuery)}`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const dataOverview = await resOverview.json();
            const dataStudents = await resStudents.json();

            setOverview(dataOverview);
            setStudents(dataStudents.students || []);
        } catch (e) {
            console.error('Failed to load HOD data:', e);
        }
    };

    useEffect(() => {
        loadHODData();
    }, [searchQuery]);

    const handleResetDevice = async (studentId, studentName) => {
        if (!window.confirm(`Take lock back / Reset device lock for ${studentName}? This frees their account so they can register their new device.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('http://localhost:5000/api/hod/reset-device-lock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ studentId })
            });
            const data = await res.json();
            if (data.success) {
                setResetNotice(`Device lock released for ${studentName}. Student can now bind their authorized device on next login.`);
                loadHODData();
                setTimeout(() => setResetNotice(null), 5000);
            }
        } catch (e) {
            console.error('Failed to reset device:', e);
        }
    };

    const handleDeclareHoliday = async (e) => {
        e.preventDefault();
        setHolidayNotice(null);

        if (!holidayTitle || !holidayDate) return;

        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('http://localhost:5000/api/holidays/declare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: holidayTitle,
                    holiday_date: holidayDate,
                    scope: 'department',
                    department,
                    reason: holidayReason,
                    is_timed: isTimed ? 1 : 0,
                    start_time: isTimed ? `${startTime}:00` : null,
                    end_time: isTimed ? `${endTime}:00` : null
                })
            });

            const data = await res.json();
            if (res.ok) {
                setHolidayNotice(data.message);
                setHolidayTitle('');
                setHolidayDate('');
                setTimeout(() => setHolidayNotice(null), 5000);
            } else {
                setHolidayNotice(data.message || data.error || 'Failed to save');
            }
        } catch (err) {
            console.error('Holiday declaration error:', err);
        }
    };

    // Filter students by locked devices if filter is active
    const displayedStudents = lockedOnlyFilter 
        ? students.filter(st => st.is_locked || st.device_name)
        : students;

    const lockedCount = students.filter(st => st.is_locked || st.device_name).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            
            {/* KPI Cards */}
            <div className="dashboard-grid-tri">
                <div className="fx-card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>Department of {department}</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--dark-blue)' }}>
                        {overview?.totalStudents || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Total Enrolled Students</div>
                </div>

                <div className="fx-card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>Present Today</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--blue)' }}>
                        {overview?.presentToday || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>In Attendance ({overview?.attendanceRate || 0}%)</div>
                </div>

                <div className="fx-card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>Active Rooms</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--blue)' }}>
                        {overview?.roomDistribution?.length || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Tap room below to view students</div>
                </div>
            </div>

            {/* HOD Faculty Teaching Session & Live Classroom OTP Generator */}
            <div className="fx-card" style={{ padding: '18px 20px', border: '1.5px solid rgba(19, 108, 252, 0.25)' }}>
                <div className="fx-card-header" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <div className="fx-card-title" style={{ fontSize: '1.05rem' }}>
                            <QrCode size={20} color="var(--blue)" />
                            HOD Faculty Teaching Session & Live Classroom OTP
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                            As teaching faculty, select where you are conducting lecture/lab to unlock the rolling 10s OTP and view your classroom roster.
                        </div>
                    </div>
                    
                    <button 
                        type="button" 
                        className="aero-glass-btn primary"
                        style={{ padding: '8px 18px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => setIsTeachingRoomModalOpen(true)}
                    >
                        <DoorOpen size={16} />
                        <span>{teachingRoomId ? 'Change Teaching Room / Lab' : 'Select Classroom (Building & Floor)'}</span>
                    </button>
                </div>

                {teachingRoomId ? (
                    <div>
                        {/* Selected Room Location Banner */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--light-blue)', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Radio size={18} color="var(--blue)" />
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.96rem' }}>
                                            {teachingRoomInfo?.building_name || 'Dr. APJ Abdul Kalam Block'}
                                        </span>
                                        <span className="room-badge">Room {teachingRoomInfo ? teachingRoomInfo.room_number : teachingRoomId}</span>
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                                        {teachingRoomInfo?.floor_name || '2nd Floor'} • {teachingRoomInfo?.name || 'Classroom / Lab'} (Dept of {department})
                                    </div>
                                </div>
                            </div>
                            <span className="count-pill green" style={{ fontSize: '0.72rem' }}>
                                Live Session Broadcasting
                            </span>
                        </div>

                        {/* Split Grid: OTP Box + Roster Table */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                            {/* 10s Rolling OTP */}
                            <div className="fx-card" style={{ textAlign: 'center', alignItems: 'center', background: '#F8FAFC', padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.88rem' }}>10-Second Rolling Code</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>Auto-Refresh</span>
                                        <input 
                                            type="checkbox" 
                                            checked={teachingAutoRegen} 
                                            onChange={(e) => setTeachingAutoRegen(e.target.checked)} 
                                            style={{ cursor: 'pointer', width: '13px', height: '13px' }}
                                        />
                                    </div>
                                </div>

                                <div className="otp-hero-box" style={{ width: '100%', margin: 0 }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>
                                        Broadcast Code for Room {teachingRoomInfo ? teachingRoomInfo.room_number : teachingRoomId}
                                    </div>
                                    <div className="otp-display-digits" style={{ fontSize: '2.4rem', margin: '6px 0' }}>
                                        {teachingOtp}
                                    </div>

                                    {/* Circular Timer */}
                                    <div className="timer-circular-wrap" style={{ margin: '8px auto' }}>
                                        <svg className="timer-svg" viewBox="0 0 90 90">
                                            <circle className="timer-circle-bg" cx="45" cy="45" r="40" />
                                            <circle 
                                                className="timer-circle-progress" 
                                                cx="45" cy="45" r="40"
                                                style={{
                                                    strokeDasharray: '251.2',
                                                    strokeDashoffset: 251.2 - (251.2 * teachingSecondsLeft) / 10,
                                                    stroke: teachingSecondsLeft <= 3 ? '#EF4444' : 'var(--blue)'
                                                }}
                                            />
                                        </svg>
                                        <div className="timer-seconds-label" style={{ color: teachingSecondsLeft <= 3 ? '#DC2626' : 'var(--dark-blue)' }}>
                                            {teachingSecondsLeft}s
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)' }}>
                                        Regenerates every 10 seconds (Strict Anti-Proxy Lock)
                                    </div>
                                </div>

                                <button 
                                    className="fx-btn-outline" 
                                    onClick={generateTeachingOtp}
                                    disabled={isGeneratingTeachingOtp}
                                    style={{ marginTop: '10px', fontSize: '0.78rem' }}
                                >
                                    <RefreshCw size={13} className={isGeneratingTeachingOtp ? 'spin-icon' : ''} />
                                    Generate Fresh OTP
                                </button>
                            </div>

                            {/* Live Students Roster */}
                            <div className="fx-card" style={{ background: '#F8FAFC', padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.88rem' }}>
                                        Live Classroom Roster ({teachingPresentCount} Checked-in)
                                    </span>
                                    <span className="aero-pill green" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                                        Room {teachingRoomInfo ? teachingRoomInfo.room_number : teachingRoomId}
                                    </span>
                                </div>

                                <div className="fx-table-container" style={{ maxHeight: '230px' }}>
                                    <table className="fx-table">
                                        <thead>
                                            <tr>
                                                <th>Official Email</th>
                                                <th>Student Name</th>
                                                <th>Time</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teachingRoomStudents.length > 0 ? (
                                                teachingRoomStudents.map((st, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#93C5FD' }}>
                                                            {st.email}
                                                        </td>
                                                        <td style={{ fontWeight: 600, color: '#FFF' }}>
                                                            {st.name}
                                                        </td>
                                                        <td style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                                                            {st.marked_at ? new Date(st.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                                        </td>
                                                        <td>
                                                            <span className="status-tag present">✓ Present</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                                                        No students have checked into Room {teachingRoomInfo ? teachingRoomInfo.room_number : teachingRoomId} yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '28px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div className="aero-badge-circle" style={{ width: '52px', height: '52px', background: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D' }}>
                            <DoorOpen size={24} />
                        </div>
                        <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '1.02rem' }}>
                            Classroom Location Required to Generate OTP
                        </div>
                        <p style={{ fontSize: '0.80rem', color: 'var(--text-sub)', maxWidth: '380px', margin: 0, lineHeight: 1.45 }}>
                            HODs can teach courses and broadcast live OTPs to students. To unlock the rolling OTP and live student roster, select your teaching Building, Floor, and Room.
                        </p>
                        <button 
                            type="button" 
                            className="aero-gloss-btn" 
                            onClick={() => setIsTeachingRoomModalOpen(true)}
                            style={{ width: 'auto', padding: '9px 20px', marginTop: '4px' }}
                        >
                            <DoorOpen size={15} style={{ marginRight: '6px' }} />
                            <span>Select Teaching Classroom / Lab</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Room Distribution & Holiday */}
            <div className="dashboard-grid-main">
                {/* Active Rooms Location: CLICKABLE */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <Building2 size={20} color="var(--blue)" />
                            Active Room Locations (Tap to Inspect)
                        </div>
                        <span className="count-pill green" style={{ fontSize: '0.72rem' }}>
                            Interactive Rooms
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {overview?.roomDistribution?.length > 0 ? (
                            overview.roomDistribution.map((r, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className="list-row-item active-room-click-card"
                                    onClick={() => setSelectedActiveRoom(r)}
                                    title={`Click to view all students currently present in Room ${r.room_number}`}
                                >
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>Room {r.room_number} – {r.room_name}</span>
                                        </div>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                                            {r.building_name} • Click to view live roster
                                        </div>
                                    </div>
                                    <span className="aero-status-tag present" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Eye size={13} />
                                        <span>{r.student_count} Present</span>
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                                No classrooms currently active for {department}.
                            </div>
                        )}
                    </div>
                </div>

                {/* Holiday & Timed Event Exemption Management */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <Calendar size={20} color="var(--blue)" />
                            Declare Department Leave / Event Exemption
                        </div>
                    </div>

                    {holidayNotice && (
                        <div className="aero-alert-success">{holidayNotice}</div>
                    )}

                    <form onSubmit={handleDeclareHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Exemption Type Switcher */}
                        <div style={{ display: 'flex', gap: '8px', background: 'var(--light-blue)', padding: '3px', borderRadius: '8px' }}>
                            <button
                                type="button"
                                className={`role-btn ${!isTimed ? 'active' : ''}`}
                                style={{ flex: 1, padding: '6px 10px', fontSize: '0.76rem' }}
                                onClick={() => setIsTimed(false)}
                            >
                                Full Day Holiday
                            </button>
                            <button
                                type="button"
                                className={`role-btn ${isTimed ? 'active' : ''}`}
                                style={{ flex: 1, padding: '6px 10px', fontSize: '0.76rem' }}
                                onClick={() => setIsTimed(true)}
                            >
                                Timed Event (Competition / Exemption)
                            </button>
                        </div>

                        <div>
                            <label className="picker-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dark-blue)' }}>
                                {isTimed ? 'Event / Competition Title' : 'Holiday Name'}
                            </label>
                            <input 
                                type="text"
                                className="fx-select"
                                style={{ width: '100%', marginTop: '4px' }}
                                placeholder={isTimed ? "e.g. Smart India Hackathon / Inter-College Coding Contest" : "e.g. 1st Saturday Institutional Holiday / Rainy Day"}
                                value={holidayTitle}
                                onChange={(e) => setHolidayTitle(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="picker-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Date</label>
                            <input 
                                type="date"
                                className="fx-select"
                                style={{ width: '100%', marginTop: '4px' }}
                                value={holidayDate}
                                onChange={(e) => setHolidayDate(e.target.value)}
                            />
                        </div>

                        {/* Timed Window Inputs */}
                        {isTimed && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Start Time</label>
                                    <input 
                                        type="time"
                                        className="fx-select"
                                        style={{ width: '100%', marginTop: '4px' }}
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>End Time</label>
                                    <input 
                                        type="time"
                                        className="fx-select"
                                        style={{ width: '100%', marginTop: '4px' }}
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <button type="submit" className="fx-btn-primary" style={{ marginTop: '4px' }}>
                            {isTimed ? 'Save Timed Event Exemption' : 'Save Department Holiday'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Device Lock Management & Student History Table */}
            <div className="fx-card">
                <div className="fx-card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <div className="fx-card-title">
                            <Users size={20} color="var(--blue)" />
                            Student Device Locks & Full Attendance History
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                            Search students, click any name to view calendar & location history, or release hardware device locks
                        </div>
                    </div>

                    {/* Filter Tabs: All vs Locked Devices */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            type="button"
                            className={`login-endpoint-tab ${!lockedOnlyFilter ? 'active' : ''}`}
                            style={{ padding: '5px 12px', fontSize: '0.74rem' }}
                            onClick={() => setLockedOnlyFilter(false)}
                        >
                            All Students ({students.length})
                        </button>
                        <button
                            type="button"
                            className={`login-endpoint-tab ${lockedOnlyFilter ? 'active' : ''}`}
                            style={{ padding: '5px 12px', fontSize: '0.74rem' }}
                            onClick={() => setLockedOnlyFilter(true)}
                        >
                            <Lock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            Locked Devices ({lockedCount})
                        </button>
                    </div>
                </div>

                {resetNotice && (
                    <div className="aero-alert-success">{resetNotice}</div>
                )}

                <div style={{ maxWidth: '380px' }}>
                    <input 
                        type="text"
                        className="fx-select"
                        style={{ width: '100%' }}
                        placeholder="Search student by name or roll number (e.g. Daniel A)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="fx-table-container">
                    <table className="fx-table">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Official College Email</th>
                                <th>Registered Device</th>
                                <th>Current Location</th>
                                <th style={{ textAlign: 'center' }}>History</th>
                                <th style={{ textAlign: 'center' }}>Device Lock Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedStudents.map((st, i) => {
                                const hasLock = !!(st.is_locked || st.device_name);
                                return (
                                    <tr 
                                        key={i}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setSelectedStudentForCalendar(st)}
                                        title="Click to view full calendar & history"
                                    >
                                        <td style={{ fontWeight: 800, color: 'var(--dark-blue)' }}>
                                            <span style={{ textDecoration: 'underline' }}>{st.name}</span>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 700 }}>
                                            {st.email}
                                        </td>
                                        <td>
                                            {hasLock ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--dark-blue)', fontWeight: 600 }}>
                                                    <Lock size={13} color="#DC2626" />
                                                    <span>{st.device_name || 'Primary Mobile'}</span>
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-dim)', fontSize: '0.76rem' }}>
                                                    <Unlock size={13} style={{ display: 'inline', marginRight: '4px' }} />
                                                    Clean / Unbound
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {st.current_room ? (
                                                <span className="aero-status-tag present">Room {st.current_room}</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Not checked-in</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button 
                                                type="button" 
                                                className="fx-btn-outline"
                                                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedStudentForCalendar(st);
                                                }}
                                            >
                                                <Eye size={12} style={{ marginRight: '4px' }} />
                                                View Calendar
                                            </button>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {hasLock ? (
                                                <button 
                                                    type="button"
                                                    className="fx-btn-danger"
                                                    style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleResetDevice(st.id, st.name);
                                                    }}
                                                    title="Take lock back / Allow student to register a new phone"
                                                >
                                                    <RotateCcw size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                                    Take Lock Back
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '0.74rem', color: '#16A34A', fontWeight: 700 }}>
                                                    Unlocked
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Live Students in Clicked Active Room */}
            <RoomStudentsModal 
                isOpen={!!selectedActiveRoom}
                onClose={() => setSelectedActiveRoom(null)}
                roomId={selectedActiveRoom?.room_id}
                roomName={selectedActiveRoom?.room_name}
                buildingName={selectedActiveRoom?.building_name}
            />

            {/* Modal: Student Month Calendar View (Image 2 Match) */}
            <AttendanceCalendarModal 
                isOpen={!!selectedStudentForCalendar}
                onClose={() => setSelectedStudentForCalendar(null)}
                student={selectedStudentForCalendar}
            />

            {/* Modal: Full Student Timeline & Location History */}
            <StudentDetailsModal 
                isOpen={!!inspectedStudentId}
                onClose={() => setInspectedStudentId(null)}
                studentId={inspectedStudentId}
            />

            {/* Modal: HOD Teaching Room Selection (Building -> Floor -> Room) */}
            <RoomSelectionModal 
                isOpen={isTeachingRoomModalOpen}
                onClose={() => setIsTeachingRoomModalOpen(false)}
                hierarchy={hierarchy}
                onSelectRoom={(bId, fId, rId) => {
                    setTeachingRoomId(Number(rId));
                    setIsTeachingRoomModalOpen(false);
                }}
                currentRoomId={teachingRoomId}
            />

        </div>
    );
};
