import React, { useState, useEffect } from 'react';
import { MapPin, KeyRound, CheckCircle2, ArrowRightLeft, Clock, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export const StudentDashboard = ({ 
    currentUser, 
    hierarchy, 
    currentPeriodInfo, 
    deviceInfo, 
    simulatedTime 
}) => {
    // Location selection
    const [selectedBuilding, setSelectedBuilding] = useState(1);
    const [selectedFloor, setSelectedFloor] = useState(3); // 2nd Floor
    const [selectedRoom, setSelectedRoom] = useState(3);   // Room 207

    // OTP Input State
    const [otpInput, setOtpInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    // Timeline data
    const [timeline, setTimeline] = useState([]);
    const [totalPresent, setTotalPresent] = useState(0);

    const loadTimeline = async () => {
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch(`http://localhost:5000/api/attendance/student-timeline/${currentUser.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.timeline) {
                setTimeline(data.timeline);
                setTotalPresent(data.totalPresent || 0);
            }
        } catch (e) {
            console.error('Failed to load timeline:', e);
        }
    };

    useEffect(() => {
        loadTimeline();
        const interval = setInterval(loadTimeline, 4000);
        return () => clearInterval(interval);
    }, [currentUser.id]);

    const activeBuildingObj = hierarchy?.find(b => b.id === Number(selectedBuilding));
    const availableFloors = activeBuildingObj?.floors || [];
    const activeFloorObj = availableFloors.find(f => f.id === Number(selectedFloor));
    const availableRooms = activeFloorObj?.rooms || [];
    const activeRoomObj = availableRooms.find(r => r.id === Number(selectedRoom));

    const handleSubmitOtp = async (e) => {
        e.preventDefault();
        setErrorMessage(null);
        setStatusMessage(null);

        if (!otpInput || otpInput.trim().length !== 6) {
            setErrorMessage('Enter the 6-digit OTP given by your staff.');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('http://localhost:5000/api/attendance/submit-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    roomId: selectedRoom,
                    otpCode: otpInput.trim(),
                    deviceInfo,
                    periodId: currentPeriodInfo?.activePeriod?.id || null,
                    currentTime: simulatedTime || null
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setErrorMessage(data.message || data.error || 'Failed to submit OTP');
            } else {
                setStatusMessage('Attendance marked successfully!');
                setOtpInput('');
                confetti({
                    particleCount: 70,
                    spread: 60,
                    origin: { y: 0.6 }
                });
                loadTimeline();
            }
        } catch (err) {
            setErrorMessage('Network error connecting to attendance server.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="dashboard-grid-wide">
            {/* Left: Location & OTP Verification */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Morning Window Alert */}
                {currentPeriodInfo?.isMorningWindow && (
                    <div className="alert-box-warning">
                        <Clock size={20} color="#F59E0B" />
                        <div>
                            <strong>9:00 AM – 9:05 AM Day-Start Verification</strong>
                            <p>Enter the 1st period OTP now to initialize your day.</p>
                        </div>
                    </div>
                )}

                {/* 1. Classroom Selection */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <MapPin size={20} color="#3B82F6" />
                            Select Classroom / Lab
                        </div>
                        <span className="room-indicator-pill">
                            Current: <strong>{activeRoomObj ? `Room ${activeRoomObj.room_number}` : 'Not Selected'}</strong>
                        </span>
                    </div>

                    <div className="location-picker-group">
                        <div className="picker-col">
                            <label className="picker-label">Building</label>
                            <select 
                                className="fx-select"
                                value={selectedBuilding}
                                onChange={(e) => {
                                    const bId = Number(e.target.value);
                                    setSelectedBuilding(bId);
                                    const b = hierarchy?.find(item => item.id === bId);
                                    if (b && b.floors?.length > 0) {
                                        setSelectedFloor(b.floors[0].id);
                                        if (b.floors[0].rooms?.length > 0) {
                                            setSelectedRoom(b.floors[0].rooms[0].id);
                                        }
                                    }
                                }}
                            >
                                {hierarchy?.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="picker-col">
                            <label className="picker-label">Floor</label>
                            <select 
                                className="fx-select"
                                value={selectedFloor}
                                onChange={(e) => {
                                    const fId = Number(e.target.value);
                                    setSelectedFloor(fId);
                                    const f = availableFloors.find(item => item.id === fId);
                                    if (f && f.rooms?.length > 0) {
                                        setSelectedRoom(f.rooms[0].id);
                                    }
                                }}
                            >
                                {availableFloors.map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="picker-col">
                            <label className="picker-label">Room Number</label>
                            <select 
                                className="fx-select"
                                value={selectedRoom}
                                onChange={(e) => setSelectedRoom(Number(e.target.value))}
                            >
                                {availableRooms.map(r => (
                                    <option key={r.id} value={r.id}>
                                        Room {r.room_number} ({r.name})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Quick Room Shortcuts */}
                    <div className="quick-room-strip">
                        <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Common Rooms:</span>
                        <button 
                            type="button"
                            className={`room-chip-btn ${selectedRoom === 3 ? 'active' : ''}`}
                            onClick={() => { setSelectedBuilding(1); setSelectedFloor(3); setSelectedRoom(3); }}
                        >
                            Room 207 (IT Hall)
                        </button>
                        <button 
                            type="button"
                            className={`room-chip-btn ${selectedRoom === 6 ? 'active' : ''}`}
                            onClick={() => { setSelectedBuilding(4); setSelectedFloor(5); setSelectedRoom(6); }}
                        >
                            AI & ML Lab
                        </button>
                        <button 
                            type="button"
                            className={`room-chip-btn ${selectedRoom === 7 ? 'active' : ''}`}
                            onClick={() => { setSelectedBuilding(4); setSelectedFloor(6); setSelectedRoom(7); }}
                        >
                            Cloud Lab
                        </button>
                    </div>
                </div>

                {/* 2. Enter OTP */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <KeyRound size={20} color="#3B82F6" />
                            Enter Attendance OTP
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                            Valid for Room {activeRoomObj ? activeRoomObj.room_number : '207'}
                        </span>
                    </div>

                    <form onSubmit={handleSubmitOtp} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', padding: '12px 0' }}>
                        <input
                            type="text"
                            maxLength="6"
                            placeholder="------"
                            className="otp-input-field"
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                            autoFocus
                        />

                        {statusMessage && (
                            <div className="alert-box-success">
                                <CheckCircle2 size={18} />
                                <span>{statusMessage}</span>
                            </div>
                        )}

                        {errorMessage && (
                            <div className="alert-box-error">
                                <AlertCircle size={18} />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="fx-btn-primary" 
                            style={{ width: '100%', maxWidth: '340px' }}
                            disabled={isSubmitting || otpInput.length !== 6}
                        >
                            {isSubmitting ? 'Verifying...' : 'Mark Present'}
                        </button>
                    </form>
                </div>

                {/* Movement note */}
                <div className="movement-info-bar">
                    <ArrowRightLeft size={16} color="#60A5FA" />
                    <span>Moving to another lab or class? Change your room above and enter the OTP from the staff in that room.</span>
                </div>
            </div>

            {/* Right: Today's Schedule */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <Clock size={20} color="#3B82F6" />
                            Today's Schedule
                        </div>
                        <span className="count-pill">
                            {totalPresent} / 7 Marked
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {timeline.map((item, idx) => (
                            <div 
                                key={idx}
                                className={`period-schedule-row ${item.is_break ? 'is-break' : ''} ${item.isMarked ? 'is-marked' : ''}`}
                            >
                                <div>
                                    <div className="p-title">{item.name}</div>
                                    <div className="p-sub">{item.start_time.slice(0, 5)} – {item.end_time.slice(0, 5)}</div>
                                </div>

                                <div>
                                    {item.is_break ? (
                                        <span className="status-tag break">Interval</span>
                                    ) : item.isMarked ? (
                                        <span className="status-tag present">
                                            ✓ Present ({item.attendance?.room_number ? `Rm ${item.attendance.room_number}` : 'Room 207'})
                                        </span>
                                    ) : (
                                        <span className="status-tag pending">Pending</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', fontSize: '0.78rem', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                        <span>📱 Device: {deviceInfo?.deviceName || 'Authorized Phone'}</span>
                        <span>Lock: Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
