import React, { useState, useEffect } from 'react';
import { Building, Users, PlusCircle, Calendar, CheckCircle2, Clock, Trash2, Layers, DoorOpen, ShieldAlert } from 'lucide-react';

export const PrincipalDashboard = ({ currentUser, hierarchy = [], simulatedTime, setSimulatedTime }) => {
    const [overviewData, setOverviewData] = useState(null);
    const [campusHierarchy, setCampusHierarchy] = useState(hierarchy || []);

    // Infrastructure forms state
    const [infraTab, setInfraTab] = useState('room'); // 'building', 'floor', 'room', 'manage'

    // Add Building state
    const [bName, setBName] = useState('');
    const [bCode, setBCode] = useState('');
    const [bDesc, setBDesc] = useState('');
    const [bNotice, setBNotice] = useState(null);

    // Add Floor state
    const [fBuildingId, setFBuildingId] = useState(1);
    const [fNumber, setFNumber] = useState('');
    const [fName, setFName] = useState('');
    const [fNotice, setFNotice] = useState(null);

    // Add Room state
    const [rBuildingId, setRBuildingId] = useState(1);
    const [rFloorId, setRFloorId] = useState(1);
    const [rNumber, setRNumber] = useState('');
    const [rName, setRName] = useState('');
    const [rDept, setRDept] = useState('IT');
    const [rCapacity, setRCapacity] = useState(60);
    const [rNotice, setRNotice] = useState(null);

    // Holiday & Timed Event Exemption state
    const [cHolTitle, setCHolTitle] = useState('');
    const [cHolDate, setCHolDate] = useState('');
    const [isTimed, setIsTimed] = useState(false);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('12:30');
    const [cHolNotice, setCHolNotice] = useState(null);

    const loadData = async () => {
        try {
            const token = localStorage.getItem('fxec_token');
            const [resOverview, resHierarchy] = await Promise.all([
                fetch('/api/principal/overview', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/locations/hierarchy')
            ]);
            const dataO = await resOverview.json();
            const dataH = await resHierarchy.json();
            setOverviewData(dataO);
            if (dataH.hierarchy) setCampusHierarchy(dataH.hierarchy);
        } catch (e) {
            console.error('Failed to load Principal data:', e);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Update available floors when selected building changes in room form
    const currentB = campusHierarchy.find(b => b.id === Number(rBuildingId));
    const availableFloorsForRoom = currentB?.floors || [];

    const handleAddBuilding = async (e) => {
        e.preventDefault();
        if (!bName || !bCode) return;
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('/api/locations/buildings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: bName, code: bCode, description: bDesc })
            });
            if (res.ok) {
                setBNotice(`Building "${bName}" (${bCode}) created successfully.`);
                setBName('');
                setBCode('');
                setBDesc('');
                loadData();
                setTimeout(() => setBNotice(null), 5000);
            }
        } catch (err) {
            console.error('Error adding building:', err);
        }
    };

    const handleAddFloor = async (e) => {
        e.preventDefault();
        if (!fNumber || !fName) return;
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('/api/locations/floors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ building_id: fBuildingId, floor_number: Number(fNumber), name: fName })
            });
            if (res.ok) {
                setFNotice(`Floor "${fName}" added successfully.`);
                setFNumber('');
                setFName('');
                loadData();
                setTimeout(() => setFNotice(null), 5000);
            }
        } catch (err) {
            console.error('Error adding floor:', err);
        }
    };

    const handleAddRoom = async (e) => {
        e.preventDefault();
        if (!rNumber || !rName) return;
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('/api/locations/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    building_id: rBuildingId,
                    floor_id: rFloorId,
                    room_number: rNumber,
                    name: rName,
                    department: rDept,
                    capacity: rCapacity
                })
            });
            if (res.ok) {
                setRNotice(`Room "${rNumber} – ${rName}" added successfully.`);
                setRNumber('');
                setRName('');
                loadData();
                setTimeout(() => setRNotice(null), 5000);
            }
        } catch (e) {
            console.error('Error adding room:', e);
        }
    };

    const handleDeleteRoom = async (roomId, roomNum) => {
        if (!window.confirm(`Delete Room ${roomNum}? This will remove it from campus locations.`)) return;
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch(`/api/locations/rooms/${roomId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                loadData();
            }
        } catch (err) {
            console.error('Error deleting room:', err);
        }
    };

    const handleDeclareCollegeHoliday = async (e) => {
        e.preventDefault();
        if (!cHolTitle || !cHolDate) return;
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('/api/holidays/declare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    title: cHolTitle,
                    holiday_date: cHolDate,
                    scope: 'college',
                    is_timed: isTimed ? 1 : 0,
                    start_time: isTimed ? `${startTime}:00` : null,
                    end_time: isTimed ? `${endTime}:00` : null
                })
            });
            const data = await res.json();
            if (res.ok) {
                setCHolNotice(data.message || 'College holiday saved successfully.');
                setCHolTitle('');
                setCHolDate('');
                setTimeout(() => setCHolNotice(null), 5000);
            } else {
                setCHolNotice(data.message || data.error || 'Failed to declare holiday');
            }
        } catch (e) {
            console.error('Error declaring holiday:', e);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            
            {/* Master College Schedule Clock Controller (Principal Exclusive) */}
            <div className="fx-card">
                <div className="fx-card-header">
                    <div className="fx-card-title">
                        <Clock size={18} color="var(--blue)" />
                        <span>Master Campus Time Controller</span>
                    </div>
                    <span className="count-pill green">
                        System Clock: {simulatedTime ? `${simulatedTime} (Simulated)` : 'Live Real Time'}
                    </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>
                        Controls global time across all student countdown wheels, period intervals, and attendance windows in real-time.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Real Live Time', val: null },
                            { label: '09:02 AM (P1 Day-Start Window)', val: '09:02:00' },
                            { label: '09:15 AM (P1 Cutoff Passed)', val: '09:15:00' },
                            { label: '10:00 AM (Period 2)', val: '10:00:00' },
                            { label: '10:50 AM (Morning Break)', val: '10:50:00' },
                            { label: '11:15 AM (Period 3)', val: '11:15:00' },
                            { label: '12:00 PM (Period 4)', val: '12:00:00' },
                            { label: '01:00 PM (Lunch Break)', val: '13:00:00' },
                            { label: '01:45 PM (Period 5)', val: '13:45:00' },
                            { label: '02:30 PM (Period 6)', val: '14:30:00' },
                            { label: '03:10 PM (Afternoon Break)', val: '15:10:00' },
                            { label: '03:45 PM (Period 7)', val: '15:45:00' }
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

            {/* Department Breakdown & Building Occupancy (Clean overview without huge enrolled cards) */}
            <div className="dashboard-grid-main">
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <Users size={20} color="var(--blue)" />
                            Department Real-Time Status
                        </div>
                    </div>

                    <div className="fx-table-container">
                        <table className="fx-table">
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    <th>Enrolled</th>
                                    <th>Present Today</th>
                                    <th>Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overviewData?.deptStats?.map((d, i) => {
                                    const rate = d.total_students > 0 ? Math.round((d.present_today / d.total_students) * 100) : 0;
                                    return (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 700, color: 'var(--dark-blue)' }}>{d.department}</td>
                                            <td>{d.total_students}</td>
                                            <td style={{ color: 'var(--blue)', fontWeight: 700 }}>{d.present_today}</td>
                                            <td>
                                                <span className={`aero-status-tag ${rate >= 75 ? 'present' : 'break'}`}>{rate}%</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* College Holiday & Event Exemption (With Timings option) */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <Calendar size={20} color="var(--blue)" />
                            Declare College Holiday / Event Exemption
                        </div>
                    </div>

                    {cHolNotice && <div className="aero-alert-success">{cHolNotice}</div>}

                    <form onSubmit={handleDeclareCollegeHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                                Timed College Event
                            </button>
                        </div>

                        <div>
                            <label className="picker-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dark-blue)' }}>
                                {isTimed ? 'Event / Symposium Title' : 'Holiday Title'}
                            </label>
                            <input 
                                type="text"
                                className="fx-select"
                                style={{ width: '100%', marginTop: '4px' }}
                                placeholder={isTimed ? "e.g. National Technical Symposium / Graduation Day" : "e.g. Founder's Day / Regional Holiday"}
                                value={cHolTitle}
                                onChange={(e) => setCHolTitle(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="picker-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Date</label>
                            <input 
                                type="date"
                                className="fx-select"
                                style={{ width: '100%', marginTop: '4px' }}
                                value={cHolDate}
                                onChange={(e) => setCHolDate(e.target.value)}
                            />
                        </div>

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
                            {isTimed ? 'Declare College-Wide Timed Exemption' : 'Declare College Holiday'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Campus Infrastructure Management (Principal Exclusive Power: Add Building, Floors, Rooms) */}
            <div className="fx-card">
                <div className="fx-card-header">
                    <div>
                        <div className="fx-card-title">
                            <Building size={20} color="var(--blue)" />
                            Campus Infrastructure Control (Buildings, Floors & Rooms)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                            Full administrative power to expand campus buildings, assign floor levels, and create classrooms / laboratories
                        </div>
                    </div>

                    {/* Infrastructure Navigation Tabs */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className={`login-endpoint-tab ${infraTab === 'room' ? 'active' : ''}`}
                            style={{ padding: '6px 12px', fontSize: '0.74rem' }}
                            onClick={() => setInfraTab('room')}
                        >
                            <PlusCircle size={13} style={{ display: 'inline', marginRight: '4px' }} />
                            Add Room / Lab
                        </button>
                        <button
                            type="button"
                            className={`login-endpoint-tab ${infraTab === 'floor' ? 'active' : ''}`}
                            style={{ padding: '6px 12px', fontSize: '0.74rem' }}
                            onClick={() => setInfraTab('floor')}
                        >
                            <Layers size={13} style={{ display: 'inline', marginRight: '4px' }} />
                            Add Floor
                        </button>
                        <button
                            type="button"
                            className={`login-endpoint-tab ${infraTab === 'building' ? 'active' : ''}`}
                            style={{ padding: '6px 12px', fontSize: '0.74rem' }}
                            onClick={() => setInfraTab('building')}
                        >
                            <Building size={13} style={{ display: 'inline', marginRight: '4px' }} />
                            Add Building
                        </button>
                        <button
                            type="button"
                            className={`login-endpoint-tab ${infraTab === 'manage' ? 'active' : ''}`}
                            style={{ padding: '6px 12px', fontSize: '0.74rem' }}
                            onClick={() => setInfraTab('manage')}
                        >
                            <DoorOpen size={13} style={{ display: 'inline', marginRight: '4px' }} />
                            Campus Directory
                        </button>
                    </div>
                </div>

                {/* Sub-View: Add Room */}
                {infraTab === 'room' && (
                    <div>
                        {rNotice && <div className="aero-alert-success" style={{ marginBottom: '14px' }}>{rNotice}</div>}
                        <form onSubmit={handleAddRoom} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'end' }}>
                            <div>
                                <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Select Building</label>
                                <select 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    value={rBuildingId} 
                                    onChange={(e) => {
                                        setRBuildingId(Number(e.target.value));
                                        const b = campusHierarchy.find(x => x.id === Number(e.target.value));
                                        if (b?.floors?.[0]) setRFloorId(b.floors[0].id);
                                    }}
                                >
                                    {campusHierarchy.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Select Floor</label>
                                <select 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    value={rFloorId} 
                                    onChange={(e) => setRFloorId(Number(e.target.value))}
                                >
                                    {availableFloorsForRoom.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Room Number</label>
                                <input 
                                    type="text" 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    placeholder="e.g. 308 / AL-05" 
                                    value={rNumber} 
                                    onChange={(e) => setRNumber(e.target.value)} 
                                />
                            </div>

                            <div>
                                <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Room / Lab Name</label>
                                <input 
                                    type="text" 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    placeholder="e.g. Cyber Security Lab" 
                                    value={rName} 
                                    onChange={(e) => setRName(e.target.value)} 
                                />
                            </div>

                            <div>
                                <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Department</label>
                                <select 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    value={rDept} 
                                    onChange={(e) => setRDept(e.target.value)}
                                >
                                    <option value="IT">Information Technology (IT)</option>
                                    <option value="CSE">Computer Science (CSE)</option>
                                    <option value="ECE">Electronics (ECE)</option>
                                    <option value="EEE">Electrical (EEE)</option>
                                    <option value="MECH">Mechanical (MECH)</option>
                                    <option value="CIVIL">Civil Engineering</option>
                                    <option value="AI-DS">Artificial Intelligence (AI-DS)</option>
                                </select>
                            </div>

                            <button type="submit" className="fx-btn-primary" style={{ height: '38px' }}>
                                Add Classroom
                            </button>
                        </form>
                    </div>
                )}

                {/* Sub-View: Add Floor */}
                {infraTab === 'floor' && (
                    <div>
                        {fNotice && <div className="aero-alert-success" style={{ marginBottom: '14px' }}>{fNotice}</div>}
                        <form onSubmit={handleAddFloor} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'end' }}>
                            <div>
                                <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Select Building</label>
                                <select 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    value={fBuildingId} 
                                    onChange={(e) => setFBuildingId(Number(e.target.value))}
                                >
                                    {campusHierarchy.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Floor Number</label>
                                <input 
                                    type="number" 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    placeholder="e.g. 3" 
                                    value={fNumber} 
                                    onChange={(e) => setFNumber(e.target.value)} 
                                />
                            </div>

                            <div>
                                <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Floor Display Name</label>
                                <input 
                                    type="text" 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    placeholder="e.g. 3rd Floor / Mezzanine" 
                                    value={fName} 
                                    onChange={(e) => setFName(e.target.value)} 
                                />
                            </div>

                            <button type="submit" className="fx-btn-primary" style={{ height: '38px' }}>
                                Add Floor
                            </button>
                        </form>
                    </div>
                )}

                {/* Sub-View: Add Building */}
                {infraTab === 'building' && (
                    <div>
                        {bNotice && <div className="aero-alert-success" style={{ marginBottom: '14px' }}>{bNotice}</div>}
                        <form onSubmit={handleAddBuilding} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'end' }}>
                            <div>
                                <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Building Name</label>
                                <input 
                                    type="text" 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    placeholder="e.g. CV Raman Science Block" 
                                    value={bName} 
                                    onChange={(e) => setBName(e.target.value)} 
                                />
                            </div>

                            <div>
                                <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Building Code</label>
                                <input 
                                    type="text" 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    placeholder="e.g. CVRB" 
                                    value={bCode} 
                                    onChange={(e) => setBCode(e.target.value)} 
                                />
                            </div>

                            <div>
                                <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Description</label>
                                <input 
                                    type="text" 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    placeholder="e.g. Research & Development Center" 
                                    value={bDesc} 
                                    onChange={(e) => setBDesc(e.target.value)} 
                                />
                            </div>

                            <button type="submit" className="fx-btn-primary" style={{ height: '38px' }}>
                                Create Building
                            </button>
                        </form>
                    </div>
                )}

                {/* Sub-View: Manage Directory */}
                {infraTab === 'manage' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {campusHierarchy.map(b => (
                            <div key={b.id} style={{ background: 'var(--light-blue)', border: '1px solid var(--border-card)', borderRadius: '10px', padding: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <div>
                                        <strong style={{ color: 'var(--dark-blue)', fontSize: '0.96rem' }}>{b.name} ({b.code})</strong>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)' }}>{b.description || `${b.floors?.length || 0} Floors`}</div>
                                    </div>
                                    <span className="aero-pill cyan">{b.floors?.length || 0} Floors</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {b.floors?.map(f => (
                                        <div key={f.id} style={{ background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dark-blue)', marginBottom: '6px' }}>
                                                {f.name} ({f.rooms?.length || 0} Rooms)
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {f.rooms?.map(r => (
                                                    <div 
                                                        key={r.id} 
                                                        style={{ 
                                                            display: 'inline-flex', 
                                                            alignItems: 'center', 
                                                            gap: '6px', 
                                                            background: 'var(--light-blue)', 
                                                            border: '1px solid var(--border-card)', 
                                                            padding: '4px 10px', 
                                                            borderRadius: '6px',
                                                            fontSize: '0.74rem'
                                                        }}
                                                    >
                                                        <span><strong>Rm {r.room_number}</strong>: {r.name}</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleDeleteRoom(r.id, r.room_number)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: '2px' }}
                                                            title="Delete Room"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};
