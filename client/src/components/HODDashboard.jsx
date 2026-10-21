import React, { useState, useEffect } from 'react';
import { Users, RotateCcw, Calendar, CheckCircle2, Search, Building2, Clock, Lock, Unlock, Eye, Sparkles } from 'lucide-react';
import { RoomStudentsModal } from './RoomStudentsModal';
import { StudentDetailsModal } from './StudentDetailsModal';

export const HODDashboard = ({ currentUser, hierarchy }) => {
    const department = currentUser?.department || 'IT';

    const [overview, setOverview] = useState(null);
    const [students, setStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [lockedOnlyFilter, setLockedOnlyFilter] = useState(false);
    const [resetNotice, setResetNotice] = useState(null);

    // Active room popup state
    const [selectedActiveRoom, setSelectedActiveRoom] = useState(null);

    // Inspected student modal state
    const [inspectedStudentId, setInspectedStudentId] = useState(null);

    // Holiday & Timed Event Exemption declaration state
    const [holidayTitle, setHolidayTitle] = useState('');
    const [holidayDate, setHolidayDate] = useState('');
    const [holidayReason, setHolidayReason] = useState('Department Institutional Event');
    const [isTimed, setIsTimed] = useState(false);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('12:30');
    const [holidayNotice, setHolidayNotice] = useState(null);

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
                                <th>Roll Number</th>
                                <th>Student Name</th>
                                <th>Email</th>
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
                                        onClick={() => setInspectedStudentId(st.id)}
                                        title="Click to view full calendar & history"
                                    >
                                        <td style={{ fontFamily: 'monospace', color: 'var(--blue)', fontWeight: 700 }}>
                                            {st.roll_number}
                                        </td>
                                        <td style={{ fontWeight: 800, color: 'var(--dark-blue)' }}>
                                            <span style={{ textDecoration: 'underline' }}>{st.name}</span>
                                        </td>
                                        <td style={{ fontSize: '0.78rem', color: 'var(--text-sub)' }}>{st.email}</td>
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
                                                    setInspectedStudentId(st.id);
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

            {/* Modal: Full Student Calendar, Timeline & Location History */}
            <StudentDetailsModal 
                isOpen={!!inspectedStudentId}
                onClose={() => setInspectedStudentId(null)}
                studentId={inspectedStudentId}
            />

        </div>
    );
};
