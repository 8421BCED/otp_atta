import React, { useState, useEffect } from 'react';
import { 
    Users, ShieldCheck, RotateCcw, Calendar, AlertTriangle, 
    CheckCircle2, Search, Building2, MapPin, Sparkles 
} from 'lucide-react';

export const HODDashboard = ({ currentUser }) => {
    const department = currentUser?.department || 'IT';

    // Overview state
    const [overview, setOverview] = useState(null);
    const [students, setStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Reset device lock state
    const [resetNotice, setResetNotice] = useState(null);

    // Holiday declaration state
    const [holidayTitle, setHolidayTitle] = useState('');
    const [holidayDate, setHolidayDate] = useState('');
    const [holidayReason, setHolidayReason] = useState('1st & 3rd Saturday Institutional Leave');
    const [holidayNotice, setHolidayNotice] = useState(null);
    const [holidayError, setHolidayError] = useState(null);

    // Load department data
    const loadHODData = async () => {
        setIsLoading(true);
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
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadHODData();
    }, [searchQuery]);

    // Handle Reset Device Lock
    const handleResetDevice = async (studentId, studentName) => {
        if (!window.confirm(`Are you sure you want to reset the device lock for ${studentName}? This will unbind their current phone and allow them to register their new phone on next login.`)) {
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
                setResetNotice(`✓ Device lock reset for ${studentName}. New phone authorization enabled.`);
                loadHODData();
                setTimeout(() => setResetNotice(null), 6000);
            }
        } catch (e) {
            console.error('Failed to reset device:', e);
        }
    };

    // Handle Declare Department Holiday
    const handleDeclareHoliday = async (e) => {
        e.preventDefault();
        setHolidayNotice(null);
        setHolidayError(null);

        if (!holidayTitle || !holidayDate) {
            setHolidayError('Please specify holiday title and date');
            return;
        }

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

            if (!res.ok) {
                setHolidayError(data.message || data.error || 'Failed to declare holiday');
            } else {
                setHolidayNotice(`✓ ${data.message}`);
                setHolidayTitle('');
                setHolidayDate('');
                setTimeout(() => setHolidayNotice(null), 6000);
            }
        } catch (err) {
            setHolidayError('Network error connecting to holiday service.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
            
            {/* Top KPI Summary Cards */}
            <div className="dashboard-grid-tri">
                <div className="fx-card fx-card-gold-accent">
                    <div className="fx-card-subtitle">Information Technology Department</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#FFF' }}>
                                {overview?.totalStudents || 0}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#93C5FD' }}>Total Enrolled IT Students</div>
                        </div>
                        <Users size={36} color="var(--fxec-gold)" />
                    </div>
                </div>

                <div className="fx-card" style={{ borderTop: '3px solid var(--fxec-emerald)' }}>
                    <div className="fx-card-subtitle">Real-Time Daily Attendance</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#34D399' }}>
                                {overview?.presentToday || 0}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#A7F3D0' }}>Students Present in Classes Now</div>
                        </div>
                        <CheckCircle2 size={36} color="var(--fxec-emerald)" />
                    </div>
                </div>

                <div className="fx-card" style={{ borderTop: '3px solid var(--fxec-cyan)' }}>
                    <div className="fx-card-subtitle">Department Attendance Rate</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--fxec-cyan)' }}>
                                {overview?.attendanceRate || 0}%
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#BAE6FD' }}>Overall Campus Compliance</div>
                        </div>
                        <Sparkles size={36} color="var(--fxec-cyan)" />
                    </div>
                </div>
            </div>

            {/* Middle Section: Classroom Live Distribution & Holiday Declarations */}
            <div className="dashboard-grid-main">
                
                {/* 1. Real-Time Classroom Distribution */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div>
                            <div className="fx-card-title">
                                <Building2 color="var(--fxec-gold)" size={22} />
                                Live Student Distribution Across Campus
                            </div>
                            <div className="fx-card-subtitle">
                                Current room occupancy of IT department students
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {overview?.roomDistribution?.length > 0 ? (
                            overview.roomDistribution.map((r, i) => (
                                <div 
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'rgba(7, 23, 47, 0.75)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        padding: '12px 16px',
                                        borderRadius: '10px'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 800, color: '#FFF', fontSize: '0.95rem' }}>
                                            Room {r.room_number} • {r.room_name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                            {r.building_name}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className="badge-present" style={{ fontSize: '0.85rem' }}>
                                            {r.student_count} Students Present
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                                No active students currently checked into rooms today.
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Department Holiday Declaration with Conflict Resolution */}
                <div className="fx-card fx-card-gold-accent">
                    <div className="fx-card-header">
                        <div>
                            <div className="fx-card-title">
                                <Calendar color="var(--fxec-gold)" size={22} />
                                Department Holiday Management
                            </div>
                            <div className="fx-card-subtitle">
                                Declare IT department leave (1st/3rd Saturday, weather emergency)
                            </div>
                        </div>
                    </div>

                    {holidayNotice && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--fxec-emerald)', borderRadius: '10px', padding: '12px', color: '#34D399', fontSize: '0.85rem' }}>
                            {holidayNotice}
                        </div>
                    )}

                    {holidayError && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--fxec-rose)', borderRadius: '10px', padding: '12px', color: '#F87171', fontSize: '0.85rem' }}>
                            {holidayError}
                        </div>
                    )}

                    <form onSubmit={handleDeclareHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label className="picker-label">Holiday Title</label>
                            <input 
                                type="text"
                                className="fx-select"
                                style={{ width: '100%', marginTop: '4px' }}
                                placeholder="e.g. 1st Saturday Institutional Holiday / Rainy Day"
                                value={holidayTitle}
                                onChange={(e) => setHolidayTitle(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="picker-label">Holiday Date</label>
                                <input 
                                    type="date"
                                    className="fx-select"
                                    style={{ width: '100%', marginTop: '4px' }}
                                    value={holidayDate}
                                    onChange={(e) => setHolidayDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="picker-label">Scope</label>
                                <input 
                                    type="text"
                                    className="fx-select"
                                    style={{ width: '100%', marginTop: '4px', opacity: 0.8 }}
                                    value="IT Department Only"
                                    disabled
                                />
                            </div>
                        </div>

                        <div>
                            <label className="picker-label">Reason / Notes</label>
                            <input 
                                type="text"
                                className="fx-select"
                                style={{ width: '100%', marginTop: '4px' }}
                                value={holidayReason}
                                onChange={(e) => setHolidayReason(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="fx-btn-primary" style={{ marginTop: '6px' }}>
                            Declare Department Holiday
                        </button>
                    </form>
                </div>

            </div>

            {/* Bottom Section: Anti-Proxy Device Security Center & Device Lock Reset */}
            <div className="fx-card">
                <div className="fx-card-header">
                    <div>
                        <div className="fx-card-title">
                            <ShieldCheck color="var(--fxec-emerald)" size={22} />
                            Anti-Proxy Device Security Management
                        </div>
                        <div className="fx-card-subtitle">
                            Every student is bound to exactly one physical phone. Click "Reset Device" if a student legitimately changed smartphones.
                        </div>
                    </div>
                </div>

                {resetNotice && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--fxec-emerald)', borderRadius: '10px', padding: '12px', color: '#34D399', fontSize: '0.88rem' }}>
                        {resetNotice}
                    </div>
                )}

                {/* Search Bar */}
                <div style={{ maxWidth: '480px' }}>
                    <input 
                        type="text"
                        className="fx-select"
                        style={{ width: '100%' }}
                        placeholder="Search student by name (e.g. Daniel A) or Roll No..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Student Device Table */}
                <div className="fx-table-container">
                    <table className="fx-table">
                        <thead>
                            <tr>
                                <th>Roll Number</th>
                                <th>Student Name</th>
                                <th>College Email</th>
                                <th>Bound Device Model</th>
                                <th>Lock Status</th>
                                <th>Current Location</th>
                                <th style={{ textAlign: 'center' }}>HOD Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((st, i) => (
                                <tr key={i}>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--fxec-gold)' }}>
                                        {st.roll_number}
                                    </td>
                                    <td style={{ fontWeight: 700, color: '#FFF' }}>{st.name}</td>
                                    <td style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{st.email}</td>
                                    <td>
                                        <strong style={{ color: '#E2E8F0' }}>
                                            {st.device_name || 'Personal Phone'}
                                        </strong>
                                    </td>
                                    <td>
                                        {st.is_locked ? (
                                            <span className="badge-locked">🔒 Device Bound</span>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Unbound</span>
                                        )}
                                    </td>
                                    <td>
                                        {st.current_room ? (
                                            <span className="badge-present">
                                                Room {st.current_room} ({st.current_building || 'MEB'})
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Not marked yet</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button 
                                            className="fx-btn-danger"
                                            onClick={() => handleResetDevice(st.id, st.name)}
                                            title="Unbind this device so the student can register their new phone"
                                        >
                                            <RotateCcw size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                            Reset Device Lock
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
