import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, QrCode, Search, Radio, CheckCircle2, DoorOpen, MapPin, Eye, Building2, Calendar, FileText, Filter } from 'lucide-react';
import { RoomSelectionModal } from './RoomSelectionModal';
import { RoomStudentsModal } from './RoomStudentsModal';
import { AttendanceCalendarModal } from './AttendanceCalendarModal';
import { StudentDetailsModal } from './StudentDetailsModal';

export const StaffDashboard = ({ 
    currentUser, 
    hierarchy, 
    currentPeriodInfo 
}) => {
    const [selectedRoomId, setSelectedRoomId] = useState(null); // Location unset initially
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [inspectedStudentId, setInspectedStudentId] = useState(null);

    // Active Room Locations State
    const [activeRooms, setActiveRooms] = useState([]);
    const [selectedActiveRoom, setSelectedActiveRoom] = useState(null);

    // Student Calendar Modal State
    const [selectedStudentForCalendar, setSelectedStudentForCalendar] = useState(null);
    const [studentFilter, setStudentFilter] = useState('all'); // 'all', 'present', 'pending'

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
        if (!selectedRoomId) return;
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

    // Countdown Timer Effect: Only runs when a classroom is selected
    useEffect(() => {
        if (!selectedRoomId) return;
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
        if (selectedRoomId) {
            generateNewOtp();
            fetchLiveRoster();
        } else {
            setCurrentOtp('------');
            setRoomInfo(null);
            setPresentCount(0);
            setRoomStudents([]);
        }
    }, [selectedRoomId]);

    // Live Room Roster Polling: Only active when room is selected
    const fetchLiveRoster = async () => {
        if (!selectedRoomId) return;
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
        if (!selectedRoomId) return;
        fetchLiveRoster();
        const poll = setInterval(fetchLiveRoster, 2000);
        return () => clearInterval(poll);
    }, [selectedRoomId]);

    // Fetch Active Room Locations in Department
    const fetchActiveRooms = async () => {
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('http://localhost:5000/api/hod/overview', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.roomDistribution) {
                setActiveRooms(data.roomDistribution);
            }
        } catch (e) {
            console.error('Failed to fetch active rooms for staff:', e);
        }
    };

    useEffect(() => {
        fetchActiveRooms();
        handleSearchStudents('');
        const pollRooms = setInterval(fetchActiveRooms, 3000);
        return () => clearInterval(pollRooms);
    }, []);

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
            
            {/* Top Room Selector: Building -> Floor -> Room */}
            <div className="fx-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Radio size={22} color={selectedRoomId ? 'var(--blue)' : 'var(--text-sub)'} />
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '1.02rem' }}>
                                    {roomInfo ? roomInfo.building_name : 'No Classroom Selected (Location Unset)'}
                                </span>
                                <span className={`room-badge ${!selectedRoomId ? 'amber' : ''}`} style={!selectedRoomId ? { background: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D' } : {}}>
                                    {selectedRoomId && roomInfo ? `Room ${roomInfo.room_number}` : 'Location Required'}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                                {selectedRoomId && roomInfo 
                                    ? `${roomInfo.floor_name} • ${roomInfo.name} (${currentUser?.department || 'IT'} Dept)`
                                    : 'Please select where you are currently conducting class (Building, Floor & Room) to unlock the 10-second OTP.'}
                            </div>
                        </div>
                    </div>

                    <button 
                        type="button" 
                        className="aero-glass-btn primary"
                        style={{ padding: '8px 18px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => setIsRoomModalOpen(true)}
                    >
                        <DoorOpen size={16} />
                        <span>{selectedRoomId ? 'Change Classroom / Lab' : 'Select Classroom (Building & Floor)'}</span>
                    </button>
                </div>
            </div>

            {/* Active Room Locations (Tap to Inspect) */}
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                    {activeRooms?.length > 0 ? (
                        activeRooms.map((r, i) => (
                            <button
                                key={i}
                                type="button"
                                className="list-row-item active-room-click-card"
                                onClick={() => setSelectedActiveRoom(r)}
                                title={`Click to view live roster for Room ${r.room_number}`}
                                style={{ border: '1px solid rgba(19, 108, 252, 0.15)', background: '#F8FAFC', padding: '12px 14px' }}
                            >
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.92rem' }}>
                                        Room {r.room_number} – {r.room_name}
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
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem', gridColumn: '1 / -1' }}>
                            No active classrooms with students currently checked-in for {currentUser?.department || 'IT'}.
                        </div>
                    )}
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
                        {selectedRoomId && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>Auto-Refresh</span>
                                <input 
                                    type="checkbox" 
                                    checked={autoRegen} 
                                    onChange={(e) => setAutoRegen(e.target.checked)} 
                                    style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                                />
                            </div>
                        )}
                    </div>

                    {selectedRoomId ? (
                        <>
                            <div className="otp-hero-box" style={{ width: '100%' }}>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Active Code for Room {roomInfo ? roomInfo.room_number : selectedRoomId}
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
                        </>
                    ) : (
                        <div style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                            <div className="aero-badge-circle" style={{ width: '56px', height: '56px', background: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D' }}>
                                <DoorOpen size={26} />
                            </div>
                            <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '1.05rem' }}>
                                Classroom Location Required
                            </div>
                            <p style={{ fontSize: '0.80rem', color: 'var(--text-sub)', maxWidth: '320px', margin: 0, lineHeight: 1.5 }}>
                                The 10-second rolling OTP is blocked until you set your current teaching location. First enter where you are (Building, Floor, and Room), then the OTP will unlock immediately.
                            </p>
                            <button 
                                type="button" 
                                className="aero-gloss-btn" 
                                onClick={() => setIsRoomModalOpen(true)}
                                style={{ width: 'auto', padding: '10px 22px', marginTop: '6px' }}
                            >
                                <DoorOpen size={15} style={{ marginRight: '6px' }} />
                                <span>Select Current Classroom / Lab</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Live Room Counter & Roster Table */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <Users size={20} color="var(--blue)" />
                            Live Classroom Roster {roomInfo ? `(Room ${roomInfo.room_number})` : ''}
                        </div>
                        <span className={`count-pill ${selectedRoomId ? 'green' : 'amber'}`}>
                            {selectedRoomId ? 'Live Sync Active' : 'Location Required'}
                        </span>
                    </div>

                    {selectedRoomId ? (
                        <>
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
                                            <th>Official Email</th>
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
                                                        {st.email}
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
                                                    No students have entered the OTP for Room {roomInfo ? roomInfo.room_number : selectedRoomId} yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.84rem' }}>
                            <Users size={34} color="var(--text-dim)" style={{ marginBottom: '10px', opacity: 0.5 }} />
                            <div style={{ fontWeight: 700, color: 'var(--dark-blue)', fontSize: '0.96rem' }}>Awaiting Classroom Selection</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px', maxWidth: '340px', margin: '6px auto 0' }}>
                                Student attendance and live check-in roster will appear here once you select your classroom above.
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Department Student Attendance & Leave Reports */}
            {(() => {
                const countPresent = searchResults.filter(st => st.current_room && st.periods_attended > 0).length;
                const countPending = searchResults.filter(st => !st.current_room || st.periods_attended === 0).length;
                const filteredStudents = searchResults.filter(st => {
                    if (studentFilter === 'present') return st.current_room && st.periods_attended > 0;
                    if (studentFilter === 'pending') return !st.current_room || st.periods_attended === 0;
                    return true;
                });

                return (
                    <div className="fx-card">
                        <div className="fx-card-header">
                            <div className="fx-card-title">
                                <FileText size={20} color="var(--blue)" />
                                Department Student Attendance & Leave Reports
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className={`role-btn ${studentFilter === 'all' ? 'active' : ''}`}
                                    style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                                    onClick={() => setStudentFilter('all')}
                                >
                                    All Students ({searchResults.length})
                                </button>
                                <button
                                    type="button"
                                    className={`role-btn ${studentFilter === 'present' ? 'active' : ''}`}
                                    style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                                    onClick={() => setStudentFilter('present')}
                                >
                                    Present Today ({countPresent})
                                </button>
                                <button
                                    type="button"
                                    className={`role-btn ${studentFilter === 'pending' ? 'active' : ''}`}
                                    style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                                    onClick={() => setStudentFilter('pending')}
                                >
                                    Pending / Not In Class ({countPending})
                                </button>
                            </div>
                        </div>

                        <div style={{ maxWidth: '420px', marginBottom: '8px' }}>
                            <input 
                                type="text"
                                className="fx-select"
                                style={{ width: '100%' }}
                                placeholder="Search by student name or official email (e.g. Daniel A or daniela.ug...)..."
                                value={searchQuery}
                                onChange={(e) => handleSearchStudents(e.target.value)}
                            />
                        </div>

                        <div className="fx-table-container">
                            <table className="fx-table">
                                <thead>
                                    <tr>
                                        <th>Official Email</th>
                                        <th>Student Name</th>
                                        <th>Current Room</th>
                                        <th>Building</th>
                                        <th>Periods Marked</th>
                                        <th style={{ textAlign: 'center' }}>Attendance & Leave Report</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((st, i) => (
                                            <tr 
                                                key={i}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setSelectedStudentForCalendar(st)}
                                                title="Click to view full calendar, daily rooms & leave report"
                                            >
                                                <td style={{ fontFamily: 'monospace', color: 'var(--blue)', fontWeight: 700 }}>
                                                    {st.email}
                                                </td>
                                                <td style={{ fontWeight: 800, color: 'var(--dark-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>{st.name}</span>
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--blue)', textDecoration: 'underline' }}>View Report</span>
                                                </td>
                                                <td><strong>{st.current_room ? `Room ${st.current_room}` : 'Not checked-in'}</strong></td>
                                                <td>{st.current_building || 'Campus'}</td>
                                                <td>
                                                    <span className="aero-status-tag present">{st.periods_attended} / 7</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button 
                                                        type="button" 
                                                        className="fx-btn-outline" 
                                                        style={{ padding: '5px 12px', fontSize: '0.74rem' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedStudentForCalendar(st);
                                                        }}
                                                    >
                                                        <FileText size={13} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                                                        View Report & Calendar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '28px', color: 'var(--text-dim)' }}>
                                                No students found matching your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

            {/* Hierarchical Building -> Floor -> Room Selection Modal */}
            <RoomSelectionModal 
                isOpen={isRoomModalOpen}
                onClose={() => setIsRoomModalOpen(false)}
                hierarchy={hierarchy}
                onSelectRoom={(bId, fId, rId) => {
                    setSelectedRoomId(rId);
                }}
                currentRoomId={selectedRoomId}
            />

            {/* Modal: Live Students in Clicked Active Room */}
            <RoomStudentsModal 
                isOpen={!!selectedActiveRoom}
                onClose={() => setSelectedActiveRoom(null)}
                roomId={selectedActiveRoom?.room_id}
                roomName={selectedActiveRoom?.room_name}
                buildingName={selectedActiveRoom?.building_name}
            />

            {/* Modal: Student Month Calendar View (Matching HOD & Student views) */}
            <AttendanceCalendarModal 
                isOpen={!!selectedStudentForCalendar}
                onClose={() => setSelectedStudentForCalendar(null)}
                student={selectedStudentForCalendar}
            />

            {/* Student Full Profile & History Modal */}
            <StudentDetailsModal 
                isOpen={!!inspectedStudentId}
                onClose={() => setInspectedStudentId(null)}
                studentId={inspectedStudentId}
            />

        </div>
    );
};
