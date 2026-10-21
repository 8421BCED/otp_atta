import React, { useState, useEffect } from 'react';
import { Building, Users, PlusCircle, Calendar, CheckCircle2, Clock } from 'lucide-react';

export const PrincipalDashboard = ({ currentUser, hierarchy, simulatedTime, setSimulatedTime }) => {
    const [overviewData, setOverviewData] = useState(null);

    // Room form state
    const [rBuildingId, setRBuildingId] = useState(1);
    const [rFloorId, setRFloorId] = useState(1);
    const [rNumber, setRNumber] = useState('');
    const [rName, setRName] = useState('');
    const [rDept, setRDept] = useState('IT');
    const [rNotice, setRNotice] = useState(null);

    // Holiday state
    const [cHolTitle, setCHolTitle] = useState('');
    const [cHolDate, setCHolDate] = useState('');
    const [cHolNotice, setCHolNotice] = useState(null);

    const loadPrincipalData = async () => {
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('http://localhost:5000/api/principal/overview', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setOverviewData(data);
        } catch (e) {
            console.error('Failed to load Principal data:', e);
        }
    };

    useEffect(() => {
        loadPrincipalData();
    }, []);

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
            if (res.ok) {
                setRNotice(`Room "${rNumber}" added successfully.`);
                setRNumber('');
                setRName('');
                loadPrincipalData();
                setTimeout(() => setRNotice(null), 5000);
            }
        } catch (e) {
            console.error('Error adding room:', e);
        }
    };

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
                    scope: 'college'
                })
            });
            const data = await res.json();
            if (res.ok) {
                setCHolNotice(`College holiday saved.`);
                setCHolTitle('');
                setCHolDate('');
                setTimeout(() => setCHolNotice(null), 5000);
            }
        } catch (e) {
            console.error('Error declaring holiday:', e);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            
            {/* Master College Schedule Clock Controller (Principal Exclusive) */}
            <div className="fx-card" style={{ border: '1px solid var(--buttermilk-border)' }}>
                <div className="fx-card-header">
                    <div className="fx-card-title">
                        <Clock size={18} color="var(--buttermilk)" />
                        <span>Master Campus Time Controller</span>
                    </div>
                    <span className="count-pill">
                        System Clock: {simulatedTime ? `${simulatedTime} (Simulated)` : 'Live Real Time'}
                    </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--smoke-subtle)' }}>
                        Selecting a time updates the global schedule, active period countdown wheels, and 10-second OTP verification windows across all student, staff, and HOD dashboards in real-time.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Real Live Time', val: null },
                            { label: '09:02 AM (P1 Day-Start Lockout)', val: '09:02:00' },
                            { label: '09:15 AM (P1 Standard)', val: '09:15:00' },
                            { label: '10:00 AM (Period 2)', val: '10:00:00' },
                            { label: '10:50 AM (Morning Break)', val: '10:50:00' },
                            { label: '11:15 AM (Period 3)', val: '11:15:00' },
                            { label: '12:00 PM (Period 4)', val: '12:00:00' },
                            { label: '01:00 PM (Lunch Break)', val: '13:00:00' },
                            { label: '01:45 PM (Period 5)', val: '13:45:00' },
                            { label: '02:30 PM (Period 6)', val: '14:30:00' },
                            { label: '03:10 PM (Afternoon Break)', val: '15:10:00' },
                            { label: '03:45 PM (Period 7 - Dismissal 4:05 PM)', val: '15:45:00' }
                        ].map((p, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className={`room-chip-btn ${(!simulatedTime && !p.val) || simulatedTime === p.val ? 'active' : ''}`}
                                onClick={() => {
                                    setSimulatedTime(p.val);
                                    if (p.val) localStorage.setItem('fxec_simulated_time', p.val);
                                    else localStorage.removeItem('fxec_simulated_time');
                                }}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Stats */}
            <div className="dashboard-grid-tri">
                <div className="fx-card">
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Total Enrolled Students</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FFF' }}>
                        {overviewData?.summary?.totalStudents || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Across All Departments</div>
                </div>

                <div className="fx-card">
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Present Today</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10B981' }}>
                        {overviewData?.summary?.totalPresent || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Overall Rate: {overviewData?.summary?.overallAttendanceRate || 0}%</div>
                </div>

                <div className="fx-card">
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Total Rooms</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#3B82F6' }}>
                        {overviewData?.summary?.totalRooms || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Classrooms & Labs</div>
                </div>
            </div>

            {/* Department Breakdown & Building Occupancy */}
            <div className="dashboard-grid-main">
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <Users size={20} color="#3B82F6" />
                            Department Breakdown
                        </div>
                    </div>

                    <div className="fx-table-container">
                        <table className="fx-table">
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    <th>Total</th>
                                    <th>Present</th>
                                    <th>Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overviewData?.deptStats?.map((d, i) => {
                                    const rate = d.total_students > 0 ? Math.round((d.present_today / d.total_students) * 100) : 0;
                                    return (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600, color: '#FFF' }}>{d.department}</td>
                                            <td>{d.total_students}</td>
                                            <td style={{ color: '#10B981', fontWeight: 600 }}>{d.present_today}</td>
                                            <td>{rate}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <Building size={20} color="#3B82F6" />
                            Building Distribution
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {overviewData?.buildingOccupancy?.map((b, i) => (
                            <div key={i} className="list-row-item">
                                <div>
                                    <div style={{ fontWeight: 600, color: '#FFF' }}>{b.building_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{b.room_count} rooms</div>
                                </div>
                                <span className="status-tag present">
                                    {b.students_present} Present
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Infrastructure Addition & College Holiday */}
            <div className="dashboard-grid-main">
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <PlusCircle size={20} color="#3B82F6" />
                            Add Classroom / Lab
                        </div>
                    </div>

                    {rNotice && <div className="alert-box-success">{rNotice}</div>}

                    <form onSubmit={handleAddRoom} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label className="picker-label">Building</label>
                                <select 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    value={rBuildingId}
                                    onChange={(e) => setRBuildingId(Number(e.target.value))}
                                >
                                    <option value={1}>Main Engineering Block</option>
                                    <option value={2}>Mechanical Block</option>
                                    <option value={3}>Science Block</option>
                                    <option value={4}>Applied Labs</option>
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

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label className="picker-label">Room Number</label>
                                <input 
                                    type="text" 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    placeholder="e.g. 209" 
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
                                    <option value="IT">IT</option>
                                    <option value="CSE">CSE</option>
                                    <option value="ECE">ECE</option>
                                    <option value="EEE">EEE</option>
                                    <option value="MECH">MECH</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="picker-label">Room Name</label>
                            <input 
                                type="text" 
                                className="fx-select" 
                                style={{ width: '100%', marginTop: '4px' }}
                                placeholder="e.g. Computer Lab 3"
                                value={rName}
                                onChange={(e) => setRName(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="fx-btn-primary">
                            Add Room
                        </button>
                    </form>
                </div>

                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <Calendar size={20} color="#3B82F6" />
                            Declare College Holiday
                        </div>
                    </div>

                    {cHolNotice && <div className="alert-box-success">{cHolNotice}</div>}

                    <form onSubmit={handleDeclareCollegeHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label className="picker-label">Holiday Title</label>
                            <input 
                                type="text"
                                className="fx-select"
                                style={{ width: '100%', marginTop: '4px' }}
                                placeholder="e.g. Pongal Festival"
                                value={cHolTitle}
                                onChange={(e) => setCHolTitle(e.target.value)}
                            />
                        </div>

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

                        <button type="submit" className="fx-btn-primary">
                            Declare College Holiday
                        </button>
                    </form>
                </div>
            </div>

        </div>
    );
};
