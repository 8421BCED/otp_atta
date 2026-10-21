import React, { useState, useEffect } from 'react';
import { MapPin, KeyRound, CheckCircle2, AlertCircle, Calendar, ArrowRightLeft, Sparkles, Navigation } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PeriodCountdownWheel } from './PeriodCountdownWheel';
import { RoomSelectionModal } from './RoomSelectionModal';
import { AttendanceCalendarModal } from './AttendanceCalendarModal';

export const StudentDashboard = ({ 
    currentUser, 
    hierarchy, 
    currentPeriodInfo, 
    deviceInfo, 
    simulatedTime 
}) => {
    // Location selection defaults to APJ Block (5) -> 2nd Floor -> Room 207, or Main Block (1)
    const [selectedBuilding, setSelectedBuilding] = useState(5); // Dr. APJ Abdul Kalam Block
    const [selectedFloor, setSelectedFloor] = useState(3);
    const [selectedRoom, setSelectedRoom] = useState(3); // Room 207

    // Modals
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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

    // Lookup current building, floor, room from hierarchy
    const activeBuildingObj = hierarchy?.find(b => b.id === Number(selectedBuilding)) || hierarchy?.[0];
    const availableFloors = activeBuildingObj?.floors || [];
    const activeFloorObj = availableFloors.find(f => f.id === Number(selectedFloor)) || availableFloors[0];
    const availableRooms = activeFloorObj?.rooms || [];
    const activeRoomObj = availableRooms.find(r => r.id === Number(selectedRoom)) || availableRooms[0];

    const handleRoomModalSelect = (bId, fId, rId) => {
        setSelectedBuilding(bId);
        setSelectedFloor(fId);
        setSelectedRoom(rId);
        setStatusMessage(`Classroom updated to Room ${rId}. Please enter the OTP from your teacher.`);
        setTimeout(() => setStatusMessage(null), 4000);
    };

    const handleSubmitOtp = async (e) => {
        e.preventDefault();
        setErrorMessage(null);
        setStatusMessage(null);

        if (!otpInput || otpInput.trim().length !== 6) {
            setErrorMessage('Enter the 6-digit rolling OTP displayed by your staff.');
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
                setStatusMessage('Attendance marked successfully! Marked present.');
                setOtpInput('');
                confetti({
                    particleCount: 75,
                    spread: 60,
                    origin: { y: 0.6 }
                });
                loadTimeline();
            }
        } catch (err) {
            setErrorMessage('Network error connecting to college attendance server.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="aero-student-grid">
            
            {/* Top Student Navigation / Quick Actions Bar */}
            <div className="aero-action-banner fa-glass-card" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="aero-badge-circle">
                        <Sparkles size={18} color="#136CFC" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--dark-blue)' }}>
                            {currentUser?.name || 'Daniel A'} • Roll No: {currentUser?.roll_number || '24IT021'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)' }}>
                            Department of Information Technology • 2nd Year (Semester 4)
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Attendance Calendar Button */}
                    <button 
                        type="button" 
                        className="aero-glass-btn"
                        onClick={() => setIsCalendarOpen(true)}
                    >
                        <Calendar size={16} color="#136CFC" />
                        <span>Attendance History</span>
                    </button>

                    {/* Change Classroom Modal Button */}
                    <button 
                        type="button" 
                        className="aero-glass-btn primary"
                        onClick={() => setIsRoomModalOpen(true)}
                    >
                        <Navigation size={16} />
                        <span>Move / Change Classroom</span>
                    </button>
                </div>
            </div>

            {/* Left Column: Period Countdown Wheel & OTP Entry */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. Frutiger Aero Period Countdown Wheel */}
                <PeriodCountdownWheel 
                    currentPeriodInfo={currentPeriodInfo} 
                    timeline={timeline}
                />

                {/* 2. Current Classroom & OTP Entry Card */}
                <div className="fa-glass-card">
                    <div className="aero-card-header">
                        <div className="aero-card-title">
                            <MapPin size={18} color="#136CFC" />
                            <span>Classroom & OTP Verification</span>
                        </div>
                        <button 
                            type="button"
                            className="aero-mini-pill-btn"
                            onClick={() => setIsRoomModalOpen(true)}
                        >
                            Change Room
                        </button>
                    </div>

                    {/* Active Room Indicator */}
                    <div className="aero-location-display">
                        <div className="loc-main">
                            <span className="bld-name">{activeBuildingObj?.name || 'Dr. APJ Abdul Kalam Block'}</span>
                            <span className="room-num">Room {activeRoomObj?.room_number || '207'}</span>
                        </div>
                        <div className="loc-sub">
                            {activeFloorObj?.name || '2nd Floor'} • {activeRoomObj?.name || 'IT 2nd Year Lecture Hall'}
                        </div>
                    </div>

                    {/* Quick Room Jump Strip */}
                    <div className="aero-quick-chips">
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>Quick Labs:</span>
                        <button 
                            type="button" 
                            className={`aero-chip ${selectedRoom === 3 ? 'active' : ''}`}
                            onClick={() => { setSelectedBuilding(1); setSelectedFloor(3); setSelectedRoom(3); }}
                        >
                            Room 207 (IT Hall)
                        </button>
                        <button 
                            type="button" 
                            className={`aero-chip ${selectedRoom === 6 ? 'active' : ''}`}
                            onClick={() => { setSelectedBuilding(4); setSelectedFloor(5); setSelectedRoom(6); }}
                        >
                            AI & ML Lab
                        </button>
                        <button 
                            type="button" 
                            className={`aero-chip ${selectedRoom === 7 ? 'active' : ''}`}
                            onClick={() => { setSelectedBuilding(4); setSelectedFloor(6); setSelectedRoom(7); }}
                        >
                            Cloud Lab
                        </button>
                    </div>

                    {/* OTP Entry Form */}
                    <form onSubmit={handleSubmitOtp} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-sub)', fontSize: '0.82rem' }}>
                            <KeyRound size={16} color="var(--blue)" />
                            <span>Enter the 6-digit rolling OTP displayed by your staff:</span>
                        </div>

                        <input
                            type="text"
                            maxLength="6"
                            placeholder="------"
                            className="aero-otp-input"
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                            autoFocus
                        />

                        {statusMessage && (
                            <div className="aero-alert-success" style={{ width: '100%', maxWidth: '340px' }}>
                                <CheckCircle2 size={18} />
                                <span>{statusMessage}</span>
                            </div>
                        )}

                        {errorMessage && (
                            <div className="aero-alert-error" style={{ width: '100%', maxWidth: '340px' }}>
                                <AlertCircle size={18} />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="aero-gloss-btn" 
                            style={{ width: '100%', maxWidth: '340px' }}
                            disabled={isSubmitting || otpInput.length !== 6}
                        >
                            <span>{isSubmitting ? 'Verifying Device & OTP...' : 'Verify & Mark Present'}</span>
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Column: Today's Schedule */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="fa-glass-card">
                    <div className="aero-card-header">
                        <div className="aero-card-title">
                            <span>Today's Official Schedule</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                                (Dismissal: 4:05 PM)
                            </span>
                        </div>
                        <span className="aero-pill cyan">
                            {totalPresent} / 7 Marked
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {timeline.map((item, idx) => (
                            <div 
                                key={idx}
                                className={`aero-schedule-row ${item.is_break ? 'is-break' : ''} ${item.isMarked ? 'is-marked' : ''}`}
                            >
                                <div>
                                    <div className="row-p-title">{item.name}</div>
                                    <div className="row-p-time">{item.start_time.slice(0, 5)} – {item.end_time.slice(0, 5)}</div>
                                </div>

                                <div>
                                    {item.is_break ? (
                                        <span className="aero-status-tag break">Interval</span>
                                    ) : item.isMarked ? (
                                        <span className="aero-status-tag present">
                                            ✓ Present ({item.attendance?.room_number ? `Rm ${item.attendance.room_number}` : 'Room 207'})
                                        </span>
                                    ) : (
                                        <span className="aero-status-tag pending">Pending</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Device Protection Footer */}
                    <div style={{ 
                        borderTop: '1px solid var(--border-subtle)', 
                        paddingTop: '12px', 
                        fontSize: '0.76rem', 
                        color: 'var(--text-sub)', 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>Device: {deviceInfo?.deviceName || 'Windows Workstation / Laptop'}</span>
                        <span style={{ color: 'var(--dark-blue)', fontWeight: 700 }}>Strict 1-Device Lock: Active</span>
                    </div>
                </div>
            </div>

            {/* Step-by-Step Room Selection Modal */}
            <RoomSelectionModal 
                isOpen={isRoomModalOpen}
                onClose={() => setIsRoomModalOpen(false)}
                hierarchy={hierarchy}
                onSelectRoom={handleRoomModalSelect}
                currentRoomId={selectedRoom}
            />

            {/* Attendance Calendar Modal */}
            <AttendanceCalendarModal 
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                currentUser={currentUser}
            />

        </div>
    );
};
