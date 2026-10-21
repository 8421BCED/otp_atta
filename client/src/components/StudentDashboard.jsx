import React, { useState, useEffect } from 'react';
import { MapPin, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PeriodCountdownWheel } from './PeriodCountdownWheel';

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
        const interval = setInterval(loadTimeline, 3000);
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
                    particleCount: 60,
                    spread: 55,
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
        <div className="dashboard-grid-student">
            {/* Left Column: Period Countdown Wheel & OTP Entry */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. Period Countdown Wheel */}
                <PeriodCountdownWheel 
                    currentPeriodInfo={currentPeriodInfo} 
                    timeline={timeline}
                />

                {/* 2. Room Selector & OTP Verification Card */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <MapPin size={18} />
                            <span>Classroom & Attendance Verification</span>
                        </div>
                        <span className="room-indicator-pill">
                            Selected: <strong>{activeRoomObj ? `Room ${activeRoomObj.room_number}` : 'Room 207'}</strong>
                        </span>
                    </div>

                    {/* Room Hierarchy Selectors */}
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
                            <label className="picker-label">Room</label>
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
                        <span style={{ fontSize: '0.78rem', color: 'var(--smoke-subtle)' }}>Quick Switch:</span>
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

                    {/* OTP Entry Form */}
                    <form onSubmit={handleSubmitOtp} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--smoke-subtle)', fontSize: '0.82rem' }}>
                            <KeyRound size={16} color="var(--buttermilk)" />
                            <span>Enter the 6-digit rolling OTP displayed by your staff:</span>
                        </div>

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
                            <div className="alert-box-success" style={{ width: '100%', maxWidth: '340px' }}>
                                <CheckCircle2 size={18} />
                                <span>{statusMessage}</span>
                            </div>
                        )}

                        {errorMessage && (
                            <div className="alert-box-error" style={{ width: '100%', maxWidth: '340px' }}>
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
            </div>

            {/* Right Column: Today's Schedule */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <span>Today's Schedule</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--smoke-subtle)', fontWeight: 500 }}>
                                (Dismissal 4:05 PM)
                            </span>
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

                    {/* Clean Enterprise Device Footer (Zero emojis) */}
                    <div style={{ 
                        borderTop: '1px solid rgba(255,242,186,0.08)', 
                        paddingTop: '12px', 
                        fontSize: '0.76rem', 
                        color: 'var(--smoke-subtle)', 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>Device: {deviceInfo?.deviceName || 'Windows Workstation / Laptop'}</span>
                        <span style={{ color: 'var(--buttermilk)', fontWeight: 600 }}>Strict 1-Device Lock: Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
