import React, { useState, useEffect } from 'react';
import { Users, RotateCcw, Calendar, CheckCircle2, Search, Building2 } from 'lucide-react';

export const HODDashboard = ({ currentUser, hierarchy }) => {
    const department = currentUser?.department || 'IT';

    const [overview, setOverview] = useState(null);
    const [students, setStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [resetNotice, setResetNotice] = useState(null);

    // Holiday declaration state
    const [holidayTitle, setHolidayTitle] = useState('');
    const [holidayDate, setHolidayDate] = useState('');
    const [holidayReason, setHolidayReason] = useState('Department Institutional Leave');
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
        if (!window.confirm(`Reset device lock for ${studentName}? This allows them to login with a new phone.`)) {
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
                setResetNotice(`Device reset for ${studentName}. New device can be registered on next login.`);
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
                    reason: holidayReason
                })
            });

            const data = await res.json();
            if (res.ok) {
                setHolidayNotice(data.message);
                setHolidayTitle('');
                setHolidayDate('');
                setTimeout(() => setHolidayNotice(null), 5000);
            }
        } catch (err) {
            console.error('Holiday declaration error:', err);
        }
    };

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
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Classrooms / Labs in Session</div>
                </div>
            </div>

            {/* Room Distribution & Holiday */}
            <div className="dashboard-grid-main">
                {/* Rooms */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <Building2 size={20} color="var(--blue)" />
                            Active Room Locations
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {overview?.roomDistribution?.length > 0 ? (
                            overview.roomDistribution.map((r, i) => (
                                <div key={i} className="list-row-item" style={{ background: 'var(--light-blue)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.9rem' }}>
                                            Room {r.room_number} – {r.room_name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{r.building_name}</div>
                                    </div>
                                    <span className="aero-status-tag present">
                                        {r.student_count} Present
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                                No rooms currently active for {department}.
                            </div>
                        )}
                    </div>
                </div>

                {/* Holiday Management */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <Calendar size={20} color="var(--blue)" />
                            Declare Department Holiday
                        </div>
                    </div>

                    {holidayNotice && (
                        <div className="aero-alert-success">{holidayNotice}</div>
                    )}

                    <form onSubmit={handleDeclareHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label className="picker-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Holiday Name</label>
                            <input 
                                type="text"
                                className="fx-select"
                                style={{ width: '100%', marginTop: '4px' }}
                                placeholder="e.g. 1st Saturday Institutional Holiday / Rainy Day"
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

                        <button type="submit" className="fx-btn-primary">
                            Save Department Holiday
                        </button>
                    </form>
                </div>
            </div>

            {/* Device Lock Management Table */}
            <div className="fx-card">
                <div className="fx-card-header">
                    <div className="fx-card-title">
                        <Users size={20} color="var(--blue)" />
                        Student Device Management
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-sub)' }}>
                        Authorized devices bound to each student
                    </span>
                </div>

                {resetNotice && (
                    <div className="aero-alert-success">{resetNotice}</div>
                )}

                <div style={{ maxWidth: '380px' }}>
                    <input 
                        type="text"
                        className="fx-select"
                        style={{ width: '100%' }}
                        placeholder="Search student (Daniel A, Kavitha)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="fx-table-container">
                    <table className="fx-table">
                        <thead>
                            <tr>
                                <th>Roll Number</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Registered Device</th>
                                <th>Current Location</th>
                                <th style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((st, i) => (
                                <tr key={i}>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--blue)', fontWeight: 700 }}>{st.roll_number}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--dark-blue)' }}>{st.name}</td>
                                    <td style={{ fontSize: '0.78rem', color: 'var(--text-sub)' }}>{st.email}</td>
                                    <td>{st.device_name || 'Primary Mobile'}</td>
                                    <td>
                                        {st.current_room ? (
                                            <span className="aero-status-tag present">Room {st.current_room}</span>
                                        ) : (
                                            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Not checked-in</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button 
                                            className="fx-btn-danger"
                                            onClick={() => handleResetDevice(st.id, st.name)}
                                        >
                                            <RotateCcw size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                            Reset Device
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};
