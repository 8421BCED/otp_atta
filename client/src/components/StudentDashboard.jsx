import React, { useState, useEffect } from 'react';
import { MapPin, KeyRound, CheckCircle2, AlertCircle, Navigation, DoorOpen, Lock } from 'lucide-react';
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
    // Dynamic classroom selection: initially null (no hardcoded defaults)
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedFloor, setSelectedFloor] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);

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

    // Lookup current building, floor, room from hierarchy if selected
    const activeBuildingObj = selectedBuilding ? hierarchy?.find(b => b.id === Number(selectedBuilding)) : null;
    const availableFloors = activeBuildingObj?.floors || [];
    const activeFloorObj = selectedFloor ? availableFloors.find(f => f.id === Number(selectedFloor)) : null;
    const availableRooms = activeFloorObj?.rooms || [];
    const activeRoomObj = selectedRoom ? availableRooms.find(r => r.id === Number(selectedRoom)) : null;

    // Check morning day-start cutoff (9:00 AM - 9:05 AM)
    const period1Item = timeline?.find(p => p.id === 1);
    const isPeriod1Marked = !!period1Item?.isMarked;
    const isPastCutoff = !!currentPeriodInfo?.isPastMorningCutoff;
    const isCurrentPeriod1 = currentPeriodInfo?.activePeriod?.period_number === 1;
    const isDayStartLocked = isCurrentPeriod1 && isPastCutoff && !isPeriod1Marked;

    const handleRoomModalSelect = (bId, fId, rId) => {
        setSelectedBuilding(bId);
        setSelectedFloor(fId);
        setSelectedRoom(rId);

        // Find room name for clean feedback
        const b = hierarchy?.find(x => x.id === Number(bId));
        const f = b?.floors?.find(x => x.id === Number(fId));
        const r = f?.rooms?.find(x => x.id === Number(rId));

        setStatusMessage(`Classroom set to Room ${r ? r.room_number : rId}. Ready for OTP verification.`);
        setTimeout(() => setStatusMessage(null), 4000);
    };

    const handleSubmitOtp = async (e) => {
        e.preventDefault();
        setErrorMessage(null);
        setStatusMessage(null);

        if (!selectedRoom) {
            setErrorMessage('Please select your classroom first before entering OTP.');
            setIsRoomModalOpen(true);
            return;
        }

        if (isDayStartLocked) {
            setErrorMessage('The 9:00 – 9:05 AM Day-Start Window has closed. Period 1 is marked Absent.');
            return;
        }

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
            
            {/* Top Student Banner */}
            <div className="aero-action-banner fa-glass-card" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="aero-badge-circle" style={{ fontWeight: 800, color: 'var(--blue)', fontSize: '0.92rem' }}>
                        FX
                    </div>
                    <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--dark-blue)' }}>
                            {currentUser?.name || 'Student'} • Roll No: {currentUser?.roll_number || '24IT021'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)' }}>
                            Department of {currentUser?.department || 'Information Technology'} • 2nd Year
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
                            {activeRoomObj ? (
                                <>
                                    <div className="building-title-row">
                                        <MapPin size={17} color="var(--blue)" className="pin-icon" />
                                        <span className="building-name">{activeBuildingObj?.name}</span>
                                        <span className="room-badge">Room {activeRoomObj?.room_number}</span>
                                    </div>
                                    <div className="floor-room-sub">
                                        {activeFloorObj?.name} • {activeRoomObj?.name}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="building-title-row">
                                        <MapPin size={17} color="var(--text-sub)" className="pin-icon" />
                                        <span className="building-name" style={{ color: 'var(--text-sub)' }}>No Classroom Selected</span>
                                    </div>
                                    <div className="floor-room-sub">
                                        Select your campus building, floor and room to submit OTP
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Move / Change Classroom button */}
                        <button 
                            type="button" 
                            className="aero-glass-btn primary move-classroom-btn"
                            onClick={() => setIsRoomModalOpen(true)}
                        >
                            <Navigation size={14} />
                            <span>{activeRoomObj ? 'Move / Change Classroom' : 'Select Classroom'}</span>
                        </button>
                    </div>

                    {/* Timer Inside Green Circle (Denoting Period Duration) */}
                    <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
                        <PeriodCountdownWheel 
                            currentPeriodInfo={currentPeriodInfo} 
                            timeline={timeline}
                        />
                    </div>

                    {/* OTP Entry Form OR Selection Prompt */}
                    {!selectedRoom ? (
                        <div className="no-room-prompt-box">
                            <DoorOpen size={28} color="var(--blue)" />
                            <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.96rem' }}>
                                Classroom Selection Required
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-sub)', maxWidth: '340px', margin: 0, textAlign: 'center' }}>
                                You must select your Building, Floor, and Classroom before you can enter the 6-digit OTP from your teacher.
                            </p>
                            <button
                                type="button"
                                className="aero-gloss-btn"
                                style={{ width: 'auto', padding: '10px 22px', marginTop: '6px' }}
                                onClick={() => setIsRoomModalOpen(true)}
                            >
                                <Navigation size={14} style={{ marginRight: '6px' }} />
                                <span>Choose Classroom Location</span>
                            </button>
                        </div>
                    ) : isDayStartLocked ? (
                        <div className="aero-alert-error" style={{ width: '100%', maxWidth: '380px', margin: '0 auto', padding: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Lock size={26} color="#DC2626" />
                            <strong style={{ fontSize: '0.92rem', color: '#DC2626' }}>Morning Cutoff Window (9:05 AM) Closed</strong>
                            <span style={{ fontSize: '0.78rem', color: 'var(--dark-blue)', lineHeight: '1.4' }}>
                                College rules require students to check in between 9:00 AM – 9:05 AM. Because this window has passed, you are marked <strong>Absent for Period 1</strong> and OTP submission is locked for this period.
                            </span>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitOtp} className="student-otp-form">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-sub)', fontSize: '0.82rem' }}>
                                <KeyRound size={15} color="var(--blue)" />
                                <span>Enter the 6-digit rolling OTP displayed by your staff in Room {activeRoomObj.room_number}:</span>
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
                    )}
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
                        {timeline.map((item, idx) => {
                            const isP1CutoffAbsent = item.id === 1 && !item.isMarked && isPastCutoff;
                            return (
                                <div 
                                    key={idx}
                                    className={`aero-schedule-row ${item.is_break ? 'is-break' : ''} ${item.isMarked ? 'is-marked' : ''} ${isP1CutoffAbsent ? 'is-absent' : ''}`}
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
                                                ✓ Present ({item.attendance?.room_number ? `Rm ${item.attendance.room_number}` : 'Verified'})
                                            </span>
                                        ) : isP1CutoffAbsent ? (
                                            <span className="aero-status-tag absent" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #EF4444' }}>
                                                ✗ Absent (Cutoff 9:05)
                                            </span>
                                        ) : (
                                            <span className="aero-status-tag pending">Pending</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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
