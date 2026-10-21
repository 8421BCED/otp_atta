import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, QrCode, Search, Radio, CheckCircle2 } from 'lucide-react';

export const StaffDashboard = ({ 
    currentUser, 
    hierarchy, 
    currentPeriodInfo 
}) => {
    const [selectedRoomId, setSelectedRoomId] = useState(3); // Room 207

    // 10s OTP State
    const [currentOtp, setCurrentOtp] = useState('------');
    const [secondsLeft, setSecondsLeft] = useState(10);
    const [autoRegen, setAutoRegen] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // Live Room Roster & Counter
    const [presentCount, setPresentCount] = useState(0);
    const [roomStudents, setRoomStudents] = useState([]);
    const [roomInfo, setRoomInfo] = useState(null);

    // Student Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const generateNewOtp = async () => {
        setIsGenerating(true);
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('http://localhost:5000/api/attendance/generate-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    roomId: selectedRoomId,
                    periodId: currentPeriodInfo?.activePeriod?.id || 1
                })
            });
            const data = await res.json();
            if (data.otpCode) {
                setCurrentOtp(data.otpCode);
                setSecondsLeft(10);
            }
        } catch (e) {
            console.error('Failed to generate OTP:', e);
        } finally {
            setIsGenerating(false);
        }
    };

    // Countdown Timer Effect
    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    if (autoRegen) {
                        generateNewOtp();
                    }
                    return 10;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [selectedRoomId, autoRegen]);

    useEffect(() => {
        generateNewOtp();
    }, [selectedRoomId]);

    // Live Room Roster Polling
    const fetchLiveRoster = async () => {
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch(`http://localhost:5000/api/attendance/room-live-roster/${selectedRoomId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.room) {
                setRoomInfo(data.room);
                setPresentCount(data.presentCount || 0);
                setRoomStudents(data.students || []);
            }
        } catch (e) {
            console.error('Failed to fetch room roster:', e);
        }
    };

    useEffect(() => {
        fetchLiveRoster();
        const poll = setInterval(fetchLiveRoster, 2000);
        return () => clearInterval(poll);
    }, [selectedRoomId]);

    const handleSearchStudents = async (query) => {
        setSearchQuery(query);
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch(`http://localhost:5000/api/hod/students?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSearchResults(data.students || []);
        } catch (e) {
            console.error('Failed to search students:', e);
        }
    };

    const strokeDashoffset = 251.2 - (251.2 * secondsLeft) / 10;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            
            {/* Top Room Selector */}
            <div className="fx-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Radio size={20} color="var(--blue)" />
                        <div>
                            <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '1rem' }}>
                                Staff Classroom Session
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)' }}>
                                {currentPeriodInfo?.activePeriod?.name || 'Class Period'} • {currentUser?.department || 'IT'} Department
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-sub)' }}>Select Classroom:</span>
                        <select 
                            className="fx-select"
                            style={{ minWidth: '240px', fontWeight: 600 }}
                            value={selectedRoomId}
                            onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                        >
                            <option value={3}>Room 207 (IT Lecture Hall)</option>
                            <option value={1}>Room 101 (IT Smart Class 1)</option>
                            <option value={2}>Room 102 (IT Smart Class 2)</option>
                            <option value={6}>Room AL-01 (Applied AI & ML Lab)</option>
                            <option value={7}>Room AL-02 (Cloud Computing Lab)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Split Screen: 10s OTP Display + Live Count & Roster */}
            <div className="dashboard-grid-main">
                
                {/* Left: 10-Second OTP Generator */}
                <div className="fx-card" style={{ textAlign: 'center', alignItems: 'center' }}>
                    <div className="fx-card-header" style={{ width: '100%' }}>
                        <div className="fx-card-title">
                            <QrCode size={20} color="var(--blue)" />
                            10-Second Rolling OTP
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>Auto-Refresh</span>
                            <input 
                                type="checkbox" 
                                checked={autoRegen} 
                                onChange={(e) => setAutoRegen(e.target.checked)} 
                                style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                            />
                        </div>
                    </div>

                    <div className="otp-hero-box" style={{ width: '100%' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Active Code for Room {roomInfo ? roomInfo.room_number : '207'}
                        </div>
                        
                        <div className="otp-display-digits">
                            {currentOtp}
                        </div>

                        {/* Circular Timer */}
                        <div className="timer-circular-wrap">
                            <svg className="timer-svg" viewBox="0 0 90 90">
                                <circle className="timer-circle-bg" cx="45" cy="45" r="40" />
                                <circle 
                                    className="timer-circle-progress" 
                                    cx="45" cy="45" r="40"
                                    style={{
                                        strokeDasharray: '251.2',
                                        strokeDashoffset: strokeDashoffset,
                                        stroke: secondsLeft <= 3 ? '#EF4444' : 'var(--blue)'
                                    }}
                                />
                            </svg>
                            <div className="timer-seconds-label" style={{ color: secondsLeft <= 3 ? '#DC2626' : 'var(--dark-blue)' }}>
                                {secondsLeft}s
                            </div>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)' }}>
                            Regenerates automatically every 10 seconds
                        </div>
                    </div>

                    <button 
                        className="fx-btn-outline" 
                        onClick={generateNewOtp}
                        disabled={isGenerating}
                        style={{ marginTop: '8px' }}
                    >
                        <RefreshCw size={14} className={isGenerating ? 'spin-icon' : ''} />
                        Generate New Code
                    </button>
                </div>

                {/* Right: Live Room Counter & Roster Table */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <Users size={20} color="var(--blue)" />
                            Live Classroom Roster (Room {roomInfo ? roomInfo.room_number : '207'})
                        </div>
                        <span className="count-pill green">
                            Live Sync Active
                        </span>
                    </div>

                    {/* Room Count Stat Box */}
                    <div className="live-count-stat-box">
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>
                                Students Present In This Room
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                Updates instantly when students enter OTP
                            </div>
                        </div>
                        <div className="stat-number-giant">
                            {presentCount}
                        </div>
                    </div>

                    {/* Present Students Table */}
                    <div className="fx-table-container" style={{ maxHeight: '280px' }}>
                        <table className="fx-table">
                            <thead>
                                <tr>
                                    <th>Roll Number</th>
                                    <th>Student Name</th>
                                    <th>Dept</th>
                                    <th>Time</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roomStudents.length > 0 ? (
                                    roomStudents.map((st, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#93C5FD' }}>
                                                {st.roll_number}
                                            </td>
                                            <td style={{ fontWeight: 600, color: '#FFF' }}>
                                                {st.name}
                                            </td>
                                            <td>{st.department}</td>
                                            <td style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                                {st.marked_at ? new Date(st.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Now'}
                                            </td>
                                            <td>
                                                <span className="status-tag present">✓ Present</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '28px', color: 'var(--text-dim)' }}>
                                            No students have entered the OTP for Room {roomInfo ? roomInfo.room_number : '207'} yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Department Student Search */}
            <div className="fx-card">
                <div className="fx-card-header">
                    <div className="fx-card-title">
                        <Search size={20} color="var(--blue)" />
                        Search Students in Department
                    </div>
                </div>

                <div style={{ maxWidth: '420px' }}>
                    <input 
                        type="text"
                        className="fx-select"
                        style={{ width: '100%' }}
                        placeholder="Search student by name (e.g. Daniel A)..."
                        value={searchQuery}
                        onChange={(e) => handleSearchStudents(e.target.value)}
                    />
                </div>

                {searchResults.length > 0 && (
                    <div className="fx-table-container">
                        <table className="fx-table">
                            <thead>
                                <tr>
                                    <th>Roll Number</th>
                                    <th>Name</th>
                                    <th>Current Room</th>
                                    <th>Building</th>
                                    <th>Periods Marked</th>
                                </tr>
                            </thead>
                            <tbody>
                                {searchResults.map((st, i) => (
                                    <tr key={i}>
                                        <td style={{ fontFamily: 'monospace', color: 'var(--blue)' }}>{st.roll_number}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--dark-blue)' }}>{st.name}</td>
                                        <td><strong>{st.current_room ? `Room ${st.current_room}` : 'Not checked-in'}</strong></td>
                                        <td>{st.current_building || 'Campus'}</td>
                                        <td>
                                            <span className="aero-status-tag present">{st.periods_attended} / 7</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
};
