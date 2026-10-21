import React, { useState, useEffect, useRef } from 'react';
import { 
    Users, RefreshCw, QrCode, Search, MapPin, 
    CheckCircle2, Clock, ShieldCheck, Flame, Radio 
} from 'lucide-react';

export const StaffDashboard = ({ 
    currentUser, 
    hierarchy, 
    currentPeriodInfo, 
    simulatedTime 
}) => {
    // Selected Classroom
    const [selectedRoomId, setSelectedRoomId] = useState(3); // Default Room 207

    // 10-Second OTP Generator State
    const [currentOtp, setCurrentOtp] = useState('------');
    const [secondsLeft, setSecondsLeft] = useState(10);
    const [autoRegen, setAutoRegen] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // Live Room Roster & Counter
    const [presentCount, setPresentCount] = useState(0);
    const [roomStudents, setRoomStudents] = useState([]);
    const [roomInfo, setRoomInfo] = useState(null);

    // Department Student Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Generate new 10-second rolling OTP
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

    // 10-second Countdown Timer Effect
    useEffect(() => {
        let timer = setInterval(() => {
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

    // Initial OTP generation on room change
    useEffect(() => {
        generateNewOtp();
    }, [selectedRoomId]);

    // Fetch Live Room Attendance Count & Student Roster
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
        const poll = setInterval(fetchLiveRoster, 2500); // Live real-time update every 2.5s
        return () => clearInterval(poll);
    }, [selectedRoomId]);

    // Search students in Department
    const handleSearchStudents = async (query) => {
        setSearchQuery(query);
        setIsSearching(true);
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch(`http://localhost:5000/api/hod/students?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSearchResults(data.students || []);
        } catch (e) {
            console.error('Failed to search students:', e);
        } finally {
            setIsSearching(false);
        }
    };

    // Calculate SVG circle progress
    const strokeDashoffset = 251.2 - (251.2 * secondsLeft) / 10;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
            
            {/* Top Command Bar: Room Selection & Period Info */}
            <div className="fx-card fx-card-gold-accent" style={{ padding: '18px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: 'rgba(255, 184, 0, 0.15)',
                            border: '1px solid var(--fxec-gold)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Radio size={24} color="var(--fxec-gold)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF' }}>
                                Classroom Session Broadcast
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#93C5FD' }}>
                                Department of {currentUser?.department || 'Information Technology'} • {currentPeriodInfo?.activePeriod?.name || 'Session Active'}
                            </div>
                        </div>
                    </div>

                    {/* Room Selector Dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1' }}>Assigned Classroom:</label>
                        <select 
                            className="fx-select"
                            style={{ minWidth: '260px', fontWeight: 700 }}
                            value={selectedRoomId}
                            onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                        >
                            <option value={3}>Room 207 - IT 2nd Year Hall (MEB 2nd Floor)</option>
                            <option value={1}>Room 101 - IT Smart Classroom 1 (MEB 1st Floor)</option>
                            <option value={2}>Room 102 - IT Smart Classroom 2 (MEB 1st Floor)</option>
                            <option value={6}>Room AL-01 - Applied AI & ML Lab (Innovation Centre)</option>
                            <option value={7}>Room AL-02 - Cloud Computing & Networks Lab</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Split Screen: 10s OTP Broadcast Card (Left) vs Live Room Roster (Right) */}
            <div className="dashboard-grid-main">
                
                {/* LEFT: 10-Second Rolling OTP Generator */}
                <div className="fx-card fx-card-gold-accent" style={{ alignItems: 'center', textAlign: 'center' }}>
                    <div className="fx-card-header" style={{ width: '100%' }}>
                        <div>
                            <div className="fx-card-title">
                                <QrCode color="var(--fxec-gold)" size={22} />
                                10-Second Rolling OTP Broadcast
                            </div>
                            <div className="fx-card-subtitle">
                                Students in Room {roomInfo ? roomInfo.room_number : '207'} must enter this OTP now
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Auto-Regenerate:</label>
                            <input 
                                type="checkbox" 
                                checked={autoRegen} 
                                onChange={(e) => setAutoRegen(e.target.checked)} 
                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--fxec-gold)' }}
                            />
                        </div>
                    </div>

                    {/* OTP Display Box */}
                    <div className="otp-hero-box" style={{ width: '100%', margin: '10px 0' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.1em', color: '#93C5FD', textTransform: 'uppercase' }}>
                            Current Classroom OTP
                        </div>
                        
                        <div className="otp-display-digits">
                            {currentOtp}
                        </div>

                        {/* Animated SVG Circular Timer */}
                        <div className="timer-circular-wrap">
                            <svg className="timer-svg" viewBox="0 0 90 90">
                                <circle 
                                    className="timer-circle-bg" 
                                    cx="45" cy="45" r="40" 
                                />
                                <circle 
                                    className="timer-circle-progress" 
                                    cx="45" cy="45" r="40"
                                    style={{
                                        strokeDasharray: '251.2',
                                        strokeDashoffset: strokeDashoffset,
                                        stroke: secondsLeft <= 3 ? 'var(--fxec-rose)' : 'var(--fxec-gold)'
                                    }}
                                />
                            </svg>
                            <div className="timer-seconds-label" style={{ color: secondsLeft <= 3 ? '#F87171' : '#FFF' }}>
                                {secondsLeft}s
                            </div>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>
                            Valid strictly for students checked into <strong>Room {roomInfo ? roomInfo.room_number : '207'}</strong>
                        </div>
                    </div>

                    {/* Manual Refresh Button */}
                    <button 
                        className="fx-btn-outline" 
                        onClick={generateNewOtp}
                        disabled={isGenerating}
                        style={{ width: '100%', maxWidth: '320px' }}
                    >
                        <RefreshCw size={16} className={isGenerating ? 'spin-icon' : ''} />
                        Regenerate OTP Immediately
                    </button>
                </div>

                {/* RIGHT: Real-time Live Room Roster & Counter */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div>
                            <div className="fx-card-title">
                                <Users color="var(--fxec-emerald)" size={22} />
                                Live Classroom Roster (Room {roomInfo ? roomInfo.room_number : '207'})
                            </div>
                            <div className="fx-card-subtitle">
                                Students verified present in this room via OTP today
                            </div>
                        </div>
                        <button 
                            className="fx-btn-outline" 
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={fetchLiveRoster}
                        >
                            <RefreshCw size={12} /> Sync
                        </button>
                    </div>

                    {/* Prominent Live Counter Box */}
                    <div className="live-count-stat-box">
                        <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#A7F3D0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Total Verified Present In This Room
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6EE7B7' }}>
                                Auto-updated in real time as students submit OTP
                            </div>
                        </div>
                        <div className="stat-number-giant">
                            {presentCount}
                        </div>
                    </div>

                    {/* Live Students Table */}
                    <div className="fx-table-container" style={{ maxHeight: '340px' }}>
                        <table className="fx-table">
                            <thead>
                                <tr>
                                    <th>Roll / Reg No.</th>
                                    <th>Student Name</th>
                                    <th>Dept</th>
                                    <th>Time Verified</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roomStudents.length > 0 ? (
                                    roomStudents.map((st, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--fxec-gold)' }}>
                                                {st.roll_number || 'FX-UG-2026'}
                                            </td>
                                            <td style={{ fontWeight: 600, color: '#FFF' }}>
                                                {st.name}
                                            </td>
                                            <td>{st.department}</td>
                                            <td style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                                                {st.marked_at ? new Date(st.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
                                            </td>
                                            <td>
                                                <span className="badge-present">✓ Present</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                                            No students have entered the OTP for this room yet today.
                                            <div style={{ fontSize: '0.78rem', marginTop: '6px' }}>
                                                Students will appear instantly as they enter the 10-second code.
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Bottom Panel: Real-Time Department Student Locator */}
            <div className="fx-card">
                <div className="fx-card-header">
                    <div>
                        <div className="fx-card-title">
                            <Search color="var(--fxec-cyan)" size={22} />
                            Department Student Live Locator
                        </div>
                        <div className="fx-card-subtitle">
                            Search any student in Information Technology to see their real-time classroom location & movement trail
                        </div>
                    </div>
                </div>

                {/* Search Input */}
                <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '600px' }}>
                    <input 
                        type="text"
                        className="fx-select"
                        style={{ flex: 1 }}
                        placeholder="Search student by name (e.g. Daniel A, Kavitha) or Roll No..."
                        value={searchQuery}
                        onChange={(e) => handleSearchStudents(e.target.value)}
                    />
                    <button 
                        className="fx-btn-primary" 
                        style={{ padding: '8px 20px', fontSize: '0.88rem' }}
                        onClick={() => handleSearchStudents(searchQuery)}
                    >
                        Search
                    </button>
                </div>

                {/* Results Table */}
                {searchResults.length > 0 && (
                    <div className="fx-table-container">
                        <table className="fx-table">
                            <thead>
                                <tr>
                                    <th>Roll Number</th>
                                    <th>Student Name</th>
                                    <th>Registered Device</th>
                                    <th>Current Classroom</th>
                                    <th>Current Building</th>
                                    <th>Periods Attended</th>
                                </tr>
                            </thead>
                            <tbody>
                                {searchResults.map((st, i) => (
                                    <tr key={i}>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--fxec-gold)' }}>
                                            {st.roll_number}
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#FFF' }}>{st.name}</td>
                                        <td>
                                            <span style={{ fontSize: '0.78rem', color: '#93C5FD' }}>
                                                {st.device_name || 'Primary Phone'}
                                            </span>
                                        </td>
                                        <td>
                                            <strong style={{ color: 'var(--fxec-gold)' }}>
                                                {st.current_room ? `Room ${st.current_room}` : 'Not checked-in yet'}
                                            </strong>
                                        </td>
                                        <td>{st.current_building || 'Campus'}</td>
                                        <td>
                                            <span className="badge-present">
                                                {st.periods_attended} / 7 Periods
                                            </span>
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
