import React, { useState, useEffect } from 'react';
import { 
    Building, School, Users, CheckCircle2, PlusCircle, 
    Calendar, Layers, MapPin, Sparkles, AlertCircle 
} from 'lucide-react';

export const PrincipalDashboard = ({ currentUser, hierarchy }) => {
    const [overviewData, setOverviewData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Add Building Modal / Form State
    const [bName, setBName] = useState('');
    const [bCode, setBCode] = useState('');
    const [bDesc, setBDesc] = useState('');
    const [bNotice, setBNotice] = useState(null);

    // Add Room Form State
    const [rBuildingId, setRBuildingId] = useState(1);
    const [rFloorId, setRFloorId] = useState(1);
    const [rNumber, setRNumber] = useState('');
    const [rName, setRName] = useState('');
    const [rDept, setRDept] = useState('IT');
    const [rNotice, setRNotice] = useState(null);

    // College-Wide Holiday State
    const [cHolTitle, setCHolTitle] = useState('');
    const [cHolDate, setCHolDate] = useState('');
    const [cHolReason, setCHolReason] = useState('Declared by Principal (College-Wide)');
    const [cHolNotice, setCHolNotice] = useState(null);

    // Load Principal Overview
    const loadPrincipalData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('http://localhost:5000/api/principal/overview', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setOverviewData(data);
        } catch (e) {
            console.error('Failed to load Principal data:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPrincipalData();
    }, []);

    // Handle Add Building
    const handleAddBuilding = async (e) => {
        e.preventDefault();
        if (!bName || !bCode) return;
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('http://localhost:5000/api/locations/buildings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: bName, code: bCode, description: bDesc })
            });
            const data = await res.json();
            if (res.ok) {
                setBNotice(`✓ Building "${bName}" added successfully!`);
                setBName('');
                setBCode('');
                setBDesc('');
                setTimeout(() => setBNotice(null), 5000);
            }
        } catch (e) {
            console.error('Error adding building:', e);
        }
    };

    // Handle Add Room
    const handleAddRoom = async (e) => {
        e.preventDefault();
        if (!rNumber || !rName) return;
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('http://localhost:5000/api/locations/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    building_id: rBuildingId,
                    floor_id: rFloorId,
                    room_number: rNumber,
                    name: rName,
                    department: rDept
                })
            });
            const data = await res.json();
            if (res.ok) {
                setRNotice(`✓ Room "${rNumber}" created successfully!`);
                setRNumber('');
                setRName('');
                loadPrincipalData();
                setTimeout(() => setRNotice(null), 5000);
            }
        } catch (e) {
            console.error('Error adding room:', e);
        }
    };

    // Handle Declare College-Wide Holiday
    const handleDeclareCollegeHoliday = async (e) => {
        e.preventDefault();
        if (!cHolTitle || !cHolDate) return;
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('http://localhost:5000/api/holidays/declare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    title: cHolTitle,
                    holiday_date: cHolDate,
                    scope: 'college',
                    reason: cHolReason
                })
            });
            const data = await res.json();
            if (res.ok) {
                setCHolNotice(`✓ College-wide holiday declared. All department calendars harmonized without conflict.`);
                setCHolTitle('');
                setCHolDate('');
                setTimeout(() => setCHolNotice(null), 6000);
            }
        } catch (e) {
            console.error('Error declaring holiday:', e);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
            
            {/* Campus KPI Metrics Banner */}
            <div className="dashboard-grid-tri">
                <div className="fx-card fx-card-gold-accent">
                    <div className="fx-card-subtitle">Executive Command Center</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#FFF' }}>
                                {overviewData?.summary?.totalStudents || 0}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#93C5FD' }}>Total Enrolled Students Across Campus</div>
                        </div>
                        <School size={36} color="var(--fxec-gold)" />
                    </div>
                </div>

                <div className="fx-card" style={{ borderTop: '3px solid var(--fxec-emerald)' }}>
                    <div className="fx-card-subtitle">Present Across All Blocks Today</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#34D399' }}>
                                {overviewData?.summary?.totalPresent || 0}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#A7F3D0' }}>Campus-Wide Attendance ({overviewData?.summary?.overallAttendanceRate || 0}%)</div>
                        </div>
                        <CheckCircle2 size={36} color="var(--fxec-emerald)" />
                    </div>
                </div>

                <div className="fx-card" style={{ borderTop: '3px solid var(--fxec-cyan)' }}>
                    <div className="fx-card-subtitle">Infrastructure Footprint</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--fxec-cyan)' }}>
                                {overviewData?.summary?.totalRooms || 0} Rooms
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#BAE6FD' }}>4 Academic Blocks • Applied Labs</div>
                        </div>
                        <Building size={36} color="var(--fxec-cyan)" />
                    </div>
                </div>
            </div>

            {/* Department-wise Comparison Grid & Building Occupancy */}
            <div className="dashboard-grid-main">
                
                {/* Department Wise Attendance Breakdown */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div>
                            <div className="fx-card-title">
                                <Users color="var(--fxec-gold)" size={22} />
                                Department-Wise Attendance Matrix
                            </div>
                            <div className="fx-card-subtitle">
                                Real-time verification counts grouped by academic department
                            </div>
                        </div>
                    </div>

                    <div className="fx-table-container">
                        <table className="fx-table">
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    <th>Total Students</th>
                                    <th>Present Today</th>
                                    <th>Attendance %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overviewData?.deptStats?.map((d, i) => {
                                    const rate = d.total_students > 0 ? Math.round((d.present_today / d.total_students) * 100) : 0;
                                    return (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 800, color: '#FFF' }}>
                                                {d.department}
                                            </td>
                                            <td>{d.total_students}</td>
                                            <td style={{ color: '#34D399', fontWeight: 700 }}>{d.present_today}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${rate}%`, height: '100%', background: 'var(--fxec-gold)' }}></div>
                                                    </div>
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{rate}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Building Occupancy Summary */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div>
                            <div className="fx-card-title">
                                <Building color="var(--fxec-cyan)" size={22} />
                                Campus Building Real-Time Distribution
                            </div>
                            <div className="fx-card-subtitle">
                                Total student density across engineering complexes
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {overviewData?.buildingOccupancy?.map((b, i) => (
                            <div 
                                key={i}
                                style={{
                                    background: 'rgba(7, 23, 47, 0.75)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '12px',
                                    padding: '14px 18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 800, color: '#FFF', fontSize: '0.98rem' }}>
                                        {b.building_name} ({b.code})
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                        {b.room_count} Active Classrooms & Labs
                                    </div>
                                </div>
                                <div>
                                    <span className="badge-present" style={{ fontSize: '0.9rem' }}>
                                        {b.students_present} Students Checked-In
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Infrastructure & Holiday Management Sections */}
            <div className="dashboard-grid-main">
                
                {/* 1. Master Infrastructure Addition (Add Room / Building) */}
                <div className="fx-card fx-card-gold-accent">
                    <div className="fx-card-header">
                        <div>
                            <div className="fx-card-title">
                                <PlusCircle color="var(--fxec-gold)" size={22} />
                                Master Infrastructure Management
                            </div>
                            <div className="fx-card-subtitle">
                                Add classrooms, specialized laboratories, and buildings
                            </div>
                        </div>
                    </div>

                    {rNotice && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--fxec-emerald)', borderRadius: '10px', padding: '10px', color: '#34D399', fontSize: '0.85rem' }}>
                            {rNotice}
                        </div>
                    )}

                    <form onSubmit={handleAddRoom} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="picker-label">Target Building</label>
                                <select 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    value={rBuildingId}
                                    onChange={(e) => setRBuildingId(Number(e.target.value))}
                                >
                                    <option value={1}>Main Engineering Block (MEB)</option>
                                    <option value={2}>Mechanical Block (MCB)</option>
                                    <option value={3}>Science Block (SHB)</option>
                                    <option value={4}>Applied Labs & Innovation Centre (ALB)</option>
                                </select>
                            </div>
                            <div>
                                <label className="picker-label">Floor</label>
                                <select 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    value={rFloorId}
                                    onChange={(e) => setRFloorId(Number(e.target.value))}
                                >
                                    <option value={1}>Ground Floor</option>
                                    <option value={2}>First Floor</option>
                                    <option value={3}>Second Floor</option>
                                    <option value={4}>Third Floor</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="picker-label">Room Number</label>
                                <input 
                                    type="text" 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    placeholder="e.g. 209, LAB-03" 
                                    value={rNumber}
                                    onChange={(e) => setRNumber(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="picker-label">Department</label>
                                <select 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    value={rDept}
                                    onChange={(e) => setRDept(e.target.value)}
                                >
                                    <option value="IT">Information Technology</option>
                                    <option value="CSE">Computer Science</option>
                                    <option value="ECE">Electronics & Communication</option>
                                    <option value="EEE">Electrical & Electronics</option>
                                    <option value="MECH">Mechanical Engineering</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="picker-label">Room Title</label>
                            <input 
                                type="text" 
                                className="fx-select" 
                                style={{ width: '100%', marginTop: '4px' }}
                                placeholder="e.g. Advanced Cybersecurity Lab / IT Seminar Hall"
                                value={rName}
                                onChange={(e) => setRName(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="fx-btn-primary" style={{ marginTop: '4px' }}>
                            Create New Room / Lab
                        </button>
                    </form>
                </div>

                {/* 2. College-Wide Holiday Management with Conflict Resolution */}
                <div className="fx-card fx-card-gold-accent">
                    <div className="fx-card-header">
                        <div>
                            <div className="fx-card-title">
                                <Calendar color="var(--fxec-gold)" size={22} />
                                College-Wide Holiday Declaration
                            </div>
                            <div className="fx-card-subtitle">
                                Principal executive holiday authority with automated conflict resolution
                            </div>
                        </div>
                    </div>

                    {cHolNotice && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--fxec-emerald)', borderRadius: '10px', padding: '10px', color: '#34D399', fontSize: '0.85rem' }}>
                            {cHolNotice}
                        </div>
                    )}

                    <form onSubmit={handleDeclareCollegeHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label className="picker-label">Holiday Name</label>
                            <input 
                                type="text"
                                className="fx-select"
                                style={{ width: '100%', marginTop: '4px' }}
                                placeholder="e.g. Pongal Festival / Autonomous Institutional Day"
                                value={cHolTitle}
                                onChange={(e) => setCHolTitle(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="picker-label">Date</label>
                                <input 
                                    type="date"
                                    className="fx-select"
                                    style={{ width: '100%', marginTop: '4px' }}
                                    value={cHolDate}
                                    onChange={(e) => setCHolDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="picker-label">Authority Level</label>
                                <input 
                                    type="text"
                                    className="fx-select"
                                    style={{ width: '100%', marginTop: '4px', opacity: 0.8 }}
                                    value="College-Wide (All Depts)"
                                    disabled
                                />
                            </div>
                        </div>

                        <div>
                            <label className="picker-label">Executive Reason</label>
                            <input 
                                type="text"
                                className="fx-select"
                                style={{ width: '100%', marginTop: '4px' }}
                                value={cHolReason}
                                onChange={(e) => setCHolReason(e.target.value)}
                            />
                        </div>

                        <div style={{ fontSize: '0.74rem', color: '#93C5FD' }}>
                            *When declared by the Principal, any department-level declarations for this date will be automatically harmonized without conflicts.
                        </div>

                        <button type="submit" className="fx-btn-primary">
                            Declare College-Wide Holiday
                        </button>
                    </form>
                </div>

            </div>

        </div>
    );
};
