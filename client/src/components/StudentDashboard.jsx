import React, { useState, useEffect } from 'react';
import { MapPin, KeyRound, CheckCircle2, AlertCircle, Navigation } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PeriodCountdownWheel } from './PeriodCountdownWheel';
import { RoomSelectionModal } from './RoomSelectionModal';

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

            if (res.ok && data.success) {
                setStatusMessage(data.message || 'Attendance verified successfully!');
                setOtpInput('');
                loadTimeline();

                // Trigger celebratory confetti
                try {
                    confetti({
                        particleCount: 65,
                        spread: 60,
                        origin: { y: 0.75 },
                        colors: ['#136CFC', '#C3F84A', '#152641']
                    });
                } catch (confettiErr) {
                    console.log('Confetti effect skipped:', confettiErr);
                }

                setTimeout(() => setStatusMessage(null), 4000);
            } else {
                setErrorMessage(data.error || 'Invalid OTP code. Please check staff screen.');
            }
        } catch (err) {
            console.error('OTP Submit error:', err);
            setErrorMessage('Failed to connect to attendance server. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="aero-student-grid">
            
            {/* Top Student Banner: No sparkles, no semester text */}
            <div className="aero-action-banner fa-glass-card" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="aero-badge-circle" style={{ fontWeight: 800, color: 'var(--blue)', fontSize: '0.92rem' }}>
                        FX
                    </div>
                    <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--dark-blue)' }}>
                            {currentUser?.name || 'Daniel A'} • Roll No: {currentUser?.roll_number || '24IT021'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)' }}>
                            Department of Information Technology • 2nd Year
                        </div>
                    </div>
                </div>
            </div>

            {/* Left Column (Primary Attendance Hub): Room Header + Timer Circle + OTP Input under it */}
            <div className="student-main-col">
                <div className="fa-glass-card attendance-hub-card">
                    {/* Classroom Location & Move Classroom Button */}
                    <div className="student-classroom-header-bar">
                        <div className="location-info-block">
                            <div className="building-title-row">
                                <MapPin size={17} color="var(--blue)" className="pin-icon" />
                                <span className="building-name">{activeBuildingObj?.name || 'Dr. APJ Abdul Kalam Block'}</span>
                                <span className="room-badge">Room {activeRoomObj?.room_number || '207'}</span>
                            </div>
                            <div className="floor-room-sub">
                                {activeFloorObj?.name || '2nd Floor'} • {activeRoomObj?.name || 'IT 2nd Year Lecture Hall'}
                            </div>
                        </div>

                        {/* Move / Change Classroom right near the timer circle */}
                        <button 
                            type="button" 
                            className="aero-glass-btn primary move-classroom-btn"
                            onClick={() => setIsRoomModalOpen(true)}
                        >
                            <Navigation size={14} />
                            <span>Move / Change Classroom</span>
                        </button>
                    </div>

                    {/* Quick Lab Jump Strip */}
                    <div className="aero-quick-chips">
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-sub)', fontWeight: 600 }}>Quick Labs:</span>
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

                    {/* Timer Inside Green Circle (Denoting Period Duration) */}
                    <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
                        <PeriodCountdownWheel 
                            currentPeriodInfo={currentPeriodInfo} 
                            timeline={timeline}
                        />
                    </div>

                    {/* OTP Entry Form: Directly under the timer circle */}
                    <form onSubmit={handleSubmitOtp} className="student-otp-form">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-sub)', fontSize: '0.82rem' }}>
                            <KeyRound size={15} color="var(--blue)" />
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
                                <CheckCircle2 size={16} />
                                <span>{statusMessage}</span>
                            </div>
                        )}

                        {errorMessage && (
                            <div className="aero-alert-error" style={{ width: '100%', maxWidth: '340px' }}>
                                <AlertCircle size={16} />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="aero-gloss-btn" 
                            style={{ width: '100%', maxWidth: '340px', padding: '11px 24px' }}
                            disabled={isSubmitting || otpInput.length !== 6}
                        >
                            <span>{isSubmitting ? 'Verifying OTP...' : 'Verify & Mark Present'}</span>
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Column: Today's Official Schedule */}
            <div className="student-schedule-col">
                <div className="fa-glass-card">
                    <div className="aero-card-header">
                        <div className="aero-card-title">
                            <span>Today's Official Schedule</span>
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

        </div>
    );
};
