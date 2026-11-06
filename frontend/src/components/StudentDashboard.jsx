import React, { useState, useEffect } from 'react';
import { MapPin, KeyRound, CheckCircle2, AlertCircle, Navigation, DoorOpen, Lock, Trophy, FileText, RotateCw, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PeriodCountdownWheel } from './PeriodCountdownWheel';
import { RoomSelectionModal } from './RoomSelectionModal';

export const StudentDashboard = ({ 
    currentUser, 
    hierarchy, 
    currentPeriodInfo, 
    deviceInfo, 
    simulatedTime,
    selectedRoom: propSelectedRoom,
    onSelectRoom: propOnSelectRoom,
    onOpenLeave
}) => {
    // Dynamic classroom selection: synced directly with database attendance records (no student localStorage reliance)
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedFloor, setSelectedFloor] = useState(null);
    const [localSelectedRoom, setLocalSelectedRoom] = useState(null);

    const selectedRoom = propSelectedRoom !== undefined ? propSelectedRoom : localSelectedRoom;
    const setSelectedRoom = propOnSelectRoom || setLocalSelectedRoom;

    // Modals
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

    // Sports OD Pass State
    const [activeSportsPass, setActiveSportsPass] = useState(null);

    // OTP Input State
    const [otpInput, setOtpInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    // Timeline data
    const [timeline, setTimeline] = useState([]);
    const [totalPresent, setTotalPresent] = useState(0);
    const [isDayLockedServer, setIsDayLockedServer] = useState(false);
    const [isHodUnlockedServer, setIsHodUnlockedServer] = useState(false);

    // Check if student has an active Sports OD Pass
    const checkSportsPass = async () => {
        if (!currentUser?.id) return;
        try {
            const res = await fetch(`/api/sports/student-active-pass/${currentUser.id}`);
            const data = await res.json();
            if (data.hasActivePass) {
                setActiveSportsPass(data.pass);
            } else {
                setActiveSportsPass(null);
            }
        } catch (e) {
            console.error('Failed to check sports pass:', e);
        }
    };

    useEffect(() => {
        if (!currentUser?.id) return;
        checkSportsPass();
        const interval = setInterval(checkSportsPass, 6000);
        return () => clearInterval(interval);
    }, [currentUser?.id]);

    const loadTimeline = async () => {
        if (!currentUser?.id) return;
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch(`/api/attendance/student-timeline/${currentUser.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.timeline) {
                setTimeline(data.timeline);
                setTotalPresent(data.totalPresent || 0);
                setIsDayLockedServer(!!data.isDayLocked);
                setIsHodUnlockedServer(!!data.isHodUnlocked);
            }
        } catch (e) {
            console.error('Failed to load timeline:', e);
        }
    };

    useEffect(() => {
        if (!currentUser?.id) return;
        loadTimeline();
        const interval = setInterval(loadTimeline, 3000);
        return () => clearInterval(interval);
    }, [currentUser?.id]);

    // Lookup current building, floor, room from hierarchy if selected
    const activeBuildingObj = selectedBuilding ? hierarchy?.find(b => b.id === Number(selectedBuilding)) : null;
    const availableFloors = activeBuildingObj?.floors || [];
    const activeFloorObj = selectedFloor ? availableFloors.find(f => f.id === Number(selectedFloor)) : null;
    const availableRooms = activeFloorObj?.rooms || [];
    const activeRoomObj = selectedRoom ? availableRooms.find(r => r.id === Number(selectedRoom)) : null;

    // Check morning day-start cutoff (9:00 AM - 9:05 AM)
    const period1Item = timeline?.find(p => p.id === 1);
    const isPeriod1Marked = !!period1Item?.isMarked;
    const isPastMorningCutoff = !!currentPeriodInfo?.isPastMorningCutoff;

    // Check post-lunch cutoff (1:30 PM - 1:35 PM / Period 5 id: 7)
    const period5Item = timeline?.find(p => p.id === 7);
    const isPeriod5Marked = !!period5Item?.isMarked;
    const isPastLunchCutoff = !!currentPeriodInfo?.isPastLunchCutoff;

    const isHodUnlocked = isHodUnlockedServer;

    const isMorningLocked = isPastMorningCutoff && !isPeriod1Marked && !isHodUnlocked;
    const isLunchLocked = isPastLunchCutoff && !isPeriod5Marked && !isHodUnlocked;

    // Day attendance is locked if either cutoff is violated and HOD hasn't unlocked
    const isDayLocked = !activeSportsPass && (isDayLockedServer || isMorningLocked || isLunchLocked);
    const isDayStartLocked = isDayLocked;

    // Determine current target period:
    // 1. If currently in normal period (from server), use it
    // 2. Otherwise (outside college hours / testing), use the first non-break period (Period 1)
    const effectiveActivePeriod = currentPeriodInfo?.activePeriod 
        || (timeline?.find(p => !p.is_break && p.isMarked))
        || (timeline?.find(p => !p.is_break))
        || (currentPeriodInfo?.allPeriods?.find(p => !p.is_break))
        || null;

    const activePeriodId = effectiveActivePeriod?.id || 1;
    const activePeriodNumber = effectiveActivePeriod?.period_number || 1;

    // Check if current active period is already marked present
    // Match by exact primary key id (p.id === activePeriodId)
    const currentPeriodItem = timeline?.find(p => p.id === activePeriodId);
    const isCurrentPeriodMarked = !!currentPeriodItem?.isMarked;
    const markedRoomId = currentPeriodItem?.attendance?.room_id;
    const markedRoomNumber = currentPeriodItem?.attendance?.room_number;

    // Detect if student has relocated to a different classroom or lab mid-period
    const isRelocating = isCurrentPeriodMarked && selectedRoom && markedRoomId && Number(selectedRoom) !== Number(markedRoomId);

    // If student was already marked in a room, sync state to current verified room from database
    useEffect(() => {
        if (markedRoomId && hierarchy?.length > 0) {
            for (const b of hierarchy) {
                for (const f of b.floors || []) {
                    for (const r of f.rooms || []) {
                        if (Number(r.id) === Number(markedRoomId)) {
                            setSelectedBuilding(b.id);
                            setSelectedFloor(f.id);
                            setSelectedRoom(r.id);
                            return;
                        }
                    }
                }
            }
        }
    }, [markedRoomId, hierarchy]);

    const handleRoomModalSelect = (bId, fId, rId) => {
        setSelectedBuilding(bId);
        setSelectedFloor(fId);
        setSelectedRoom(rId);

        // Find room name for clean feedback
        const b = hierarchy?.find(x => x.id === Number(bId));
        const f = b?.floors?.find(x => x.id === Number(fId));
        const r = f?.rooms?.find(x => x.id === Number(rId));

        if (markedRoomId && Number(rId) !== Number(markedRoomId)) {
            setStatusMessage(`Relocating to Room ${r ? r.room_number : rId}. Please enter the Lab Check-in OTP.`);
        } else {
            setStatusMessage(`Classroom set to Room ${r ? r.room_number : rId}. Ready for OTP verification.`);
        }
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
            const res = await fetch('/api/attendance/submit-otp', {
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

                // Optimistically update timeline so verified banner displays immediately
                const targetPId = data.periodId || activePeriodId;
                setTimeline(prev => prev.map(p => {
                    if (p.id === targetPId) {
                        return {
                            ...p,
                            isMarked: true,
                            status: 'present',
                            attendance: {
                                period_id: targetPId,
                                room_id: selectedRoom,
                                room_number: activeRoomObj?.room_number || String(selectedRoom),
                                status: 'present'
                            }
                        };
                    }
                    return p;
                }));
                setTotalPresent(prev => prev + 1);

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
                setErrorMessage(data.message || data.error || 'Invalid OTP code. Please check staff screen.');
            }
        } catch (err) {
            console.error('OTP Submit error:', err);
            setErrorMessage('Failed to connect to attendance server. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="aero-student-grid">
            
            {/* Canery Compact Student Card */}
            <div className="student-hero-banner compact-student-banner">
                <div className="hero-banner-top">
                    <div className="hero-student-meta">
                        <div className="hero-avatar-ring">
                            <span>{currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'D'}</span>
                        </div>
                        <div className="hero-text-col">
                            <h2 className="hero-student-name">
                                {currentUser?.name ? currentUser.name.toUpperCase() : 'DANIEL A'}
                            </h2>
                            <span className="hero-student-id">
                                {currentUser?.department ? `${currentUser.department} Department` : 'Information Technology'}
                            </span>
                        </div>
                    </div>
                    
                    <div className="hero-compact-actions">
                        <div className="hero-mini-badge">
                            <span className="badge-dot" style={{ background: isDayLocked ? '#EF4444' : '#22C55E' }} />
                            <span className="badge-text">{isDayLocked ? 'Locked' : `${totalPresent}/7 Marked`}</span>
                        </div>
                        <button 
                            type="button" 
                            className="hero-refresh-btn" 
                            onClick={() => loadTimeline()}
                            title="Sync Real-Time Attendance"
                            aria-label="Refresh attendance"
                        >
                            <RotateCw size={15} strokeWidth={2.4} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Primary Attendance Hub: Room Header + Timer Circle + OTP Input under it */}
            <div className="student-main-col">
                <div className="fa-glass-card attendance-hub-card">
                    {/* Subtle Room Indicator on Top of Timer */}
                    {activeRoomObj && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px 6px' }}>
                            <div className="building-title-row">
                                <MapPin size={15} color="var(--blue)" className="pin-icon" />
                                <span className="building-name" style={{ fontSize: '0.84rem' }}>{activeBuildingObj?.name}</span>
                                <span className="room-badge" style={{ fontSize: '0.74rem' }}>Room {activeRoomObj?.room_number}</span>
                            </div>
                        </div>
                    )}

                    {/* Timer Inside Green Circle (Denoting Period Duration) */}
                    <div style={{ padding: '4px 0', display: 'flex', justifyContent: 'center' }}>
                        <PeriodCountdownWheel 
                            currentPeriodInfo={currentPeriodInfo} 
                            timeline={timeline}
                        />
                    </div>

                    {/* Attendance Form / Prompt / Confirmation */}
                    {activeSportsPass ? (
                        <div style={{ 
                            width: '100%', 
                            maxWidth: '400px', 
                            margin: '0 auto', 
                            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', 
                            border: '1.5px solid #F59E0B', 
                            borderRadius: '14px', 
                            padding: '18px 20px', 
                            textAlign: 'center', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            gap: '8px', 
                            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.12)' 
                        }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F59E0B', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trophy size={24} />
                            </div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Official Sports On-Duty (OD) Pass
                            </div>
                            <strong style={{ fontSize: '1.05rem', color: '#78350F' }}>
                                {activeSportsPass.event_name}
                            </strong>
                            <div style={{ fontSize: '0.78rem', color: '#92400E' }}>
                                {activeSportsPass.sport_category} • {activeSportsPass.venue}
                            </div>
                            <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid #FDE68A', fontSize: '0.74rem', color: '#78350F', marginTop: '4px', width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div><strong style={{ color: '#16A34A' }}>100% Present Credited:</strong> On-Duty attendance officially logged.</div>
                                <div><strong style={{ color: '#16A34A' }}>OTP Entry Exempt:</strong> No 10-second rolling code required.</div>
                                <div><strong style={{ color: '#16A34A' }}>Lockout Exemption:</strong> Morning 9:00 - 9:05 AM lockout lifted.</div>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#B45309', marginTop: '2px' }}>
                                Authorized by: {activeSportsPass.issued_by || 'Director of Physical Education'}
                            </div>
                        </div>
                    ) : isRelocating ? (
                        <div className="student-relocation-box" style={{ width: '100%', maxWidth: '390px', margin: '0 auto', background: '#F8FAFC', border: '1.5px solid rgba(19, 108, 252, 0.35)', borderRadius: '14px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Navigation size={18} color="var(--blue)" />
                                    <span style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.94rem' }}>
                                        Lab / Classroom Relocation Check-in
                                    </span>
                                </div>
                                <span className="aero-pill cyan" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                                    Arrival Verification
                                </span>
                            </div>

                            <div style={{ background: '#FFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.78rem', color: 'var(--text-sub)' }}>
                                <div>Previously checked in: <strong style={{ color: 'var(--dark-blue)' }}>Room {markedRoomNumber || markedRoomId}</strong></div>
                                <div style={{ marginTop: '2px' }}>Moving to: <strong style={{ color: 'var(--blue)' }}>Room {activeRoomObj ? activeRoomObj.room_number : selectedRoom} ({activeRoomObj ? activeRoomObj.name : 'Lab'})</strong></div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>{activeBuildingObj?.name} • {activeFloorObj?.name}</div>
                            </div>

                            <p style={{ fontSize: '0.76rem', color: 'var(--text-sub)', margin: 0, lineHeight: 1.4 }}>
                                The faculty member in this lab is broadcasting an active OTP. Enter the 6-digit rolling OTP displayed in this lab to verify your arrival:
                            </p>

                            <form onSubmit={handleSubmitOtp} className="student-otp-form" style={{ width: '100%', gap: '8px' }}>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoComplete="one-time-code"
                                    maxLength="6"
                                    placeholder="------"
                                    className="aero-otp-input"
                                    value={otpInput}
                                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                    autoFocus
                                    style={{ width: '100%', maxWidth: '240px', margin: '0 auto' }}
                                />

                                {statusMessage && (
                                    <div className="aero-alert-success" style={{ width: '100%' }}>
                                        <CheckCircle2 size={16} />
                                        <span>{statusMessage}</span>
                                    </div>
                                )}

                                {errorMessage && (
                                    <div className="aero-alert-error" style={{ width: '100%' }}>
                                        <AlertCircle size={16} />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    className="aero-gloss-btn" 
                                    style={{ width: '100%', padding: '10px 20px', marginTop: '2px' }}
                                    disabled={isSubmitting || otpInput.length !== 6}
                                >
                                    <span>{isSubmitting ? 'Verifying Lab OTP...' : 'Verify Lab Arrival & Check-in'}</span>
                                </button>

                                <button 
                                    type="button" 
                                    className="fx-btn-outline"
                                    style={{ width: '100%', padding: '6px 12px', fontSize: '0.74rem' }}
                                    onClick={() => {
                                        setSelectedRoom(markedRoomId);
                                        if (hierarchy) {
                                            for (const b of hierarchy) {
                                                for (const f of b.floors || []) {
                                                    for (const r of f.rooms || []) {
                                                        if (Number(r.id) === Number(markedRoomId)) {
                                                            setSelectedBuilding(b.id);
                                                            setSelectedFloor(f.id);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }}
                                >
                                    Cancel (Stay in Room {markedRoomNumber || markedRoomId})
                                </button>
                            </form>
                        </div>
                    ) : isDayLocked ? (
                        <div style={{
                            width: '100%',
                            maxWidth: '430px',
                            margin: '0 auto',
                            background: '#FEFDFB',
                            border: '2px solid #FCA5A5',
                            borderRadius: '22px',
                            padding: '24px 20px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '14px',
                            boxShadow: '0 8px 30px -6px rgba(185, 28, 28, 0.12), 0 1px 3px rgba(15, 23, 43, 0.05)'
                        }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '20px',
                                background: '#FEE2E2',
                                border: '2px solid #FCA5A5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#B91C1C',
                                boxShadow: '0 2px 8px rgba(185, 28, 28, 0.12)'
                            }}>
                                <Lock size={28} strokeWidth={2.4} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 850, fontSize: '1.25rem', color: '#991B1B', letterSpacing: '-0.01em' }}>
                                    {isLunchLocked ? 'Post-Lunch Attendance Locked' : 'Day Attendance Locked'}
                                </div>
                                <div style={{ fontSize: '0.84rem', color: '#B91C1C', fontWeight: 750, marginTop: '4px' }}>
                                    {isLunchLocked ? 'Period 5 Cutoff (1:35 PM) Missed' : 'Period 1 Cutoff (09:05 AM) Missed'}
                                </div>
                            </div>
                            <p style={{ fontSize: '0.86rem', color: '#451A03', margin: 0, lineHeight: 1.55, maxWidth: '380px' }}>
                                {isLunchLocked 
                                    ? <>You did not enter your OTP between <strong>1:30 PM and 1:35 PM</strong> (within 5 minutes of lunch conclusion). In accordance with college anti-proxy rules, your afternoon attendance is locked.</>
                                    : <>You did not enter your OTP between <strong>09:00 AM and 09:05 AM</strong> for the first period. In accordance with college anti-proxy rules, your day attendance is locked.</>
                                }
                            </p>
                            <div style={{
                                background: '#FFF7ED',
                                border: '1.5px dashed #FDBA74',
                                borderRadius: '14px',
                                padding: '14px 16px',
                                width: '100%',
                                fontSize: '0.82rem',
                                color: '#9A3412',
                                fontWeight: 700,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                textAlign: 'left'
                            }}>
                                <div><strong>Action Required:</strong> Meet your HOD in person to unlock.</div>
                                <div style={{ fontSize: '0.76rem', color: '#C2410C', fontWeight: 600 }}>
                                    Once authorized, your HOD will unlock your attendance from their dashboard.
                                </div>
                            </div>
                        </div>
                    ) : isCurrentPeriodMarked ? (
                        <div className="aero-alert-success" style={{ width: '100%', maxWidth: '380px', margin: '0 auto', padding: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={28} color="#16A34A" />
                            <strong style={{ fontSize: '0.98rem', color: '#15803D' }}>
                                Period {activePeriodNumber} Attendance Recorded
                            </strong>
                            <span style={{ fontSize: '0.80rem', color: 'var(--dark-blue)', lineHeight: '1.4' }}>
                                You are recorded <strong>Present {currentPeriodItem?.attendance?.room_number ? `in Room ${currentPeriodItem.attendance.room_number}` : ''}</strong> for this period. OTP verification complete.
                            </span>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)', marginTop: '4px', background: 'rgba(22, 163, 74, 0.08)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(22, 163, 74, 0.2)' }}>
                                Need to go to a lab? Click <strong>Move / Change Classroom</strong> above to switch to the lab and enter the lab faculty's check-in OTP.
                            </div>
                        </div>
                    ) : !selectedRoom ? (
                        <div className="student-otp-wrap" style={{ width: '100%', maxWidth: '340px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            {isHodUnlocked && (
                                <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', padding: '6px 10px', color: '#166534', fontSize: '0.74rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', width: '100%' }}>
                                    <CheckCircle2 size={15} color="#16A34A" />
                                    <span>Day Attendance Unlocked by HOD.</span>
                                </div>
                            )}
                            <form onSubmit={handleSubmitOtp} className="student-otp-form" style={{ width: '100%' }}>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoComplete="one-time-code"
                                    maxLength="6"
                                    placeholder="------"
                                    className="aero-otp-input"
                                    value={otpInput}
                                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                />
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
                            <span style={{ fontSize: '0.74rem', color: '#64748B', textAlign: 'center', marginTop: '2px' }}>
                                Tap <strong>Classroom</strong> at the bottom to set your room
                            </span>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitOtp} className="student-otp-form">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-sub)', fontSize: '0.82rem' }}>
                                <KeyRound size={15} color="var(--blue)" />
                                <span>Enter the 6-digit rolling OTP displayed by your staff in Room {activeRoomObj ? activeRoomObj.room_number : (markedRoomNumber || selectedRoom || '')}:</span>
                            </div>

                            <input
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="one-time-code"
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
                            const isP1CutoffAbsent = item.id === 1 && !item.isMarked && isPastMorningCutoff;
                            const isCurrentActive = currentPeriodInfo?.activePeriod?.id === item.id;
                            const roomNum = item.attendance?.room_number || (item.isMarked && item.id === activePeriodId ? (activeRoomObj?.room_number || selectedRoom) : null);
                            const roomBuilding = item.attendance?.building_name || (item.isMarked && item.id === activePeriodId ? activeBuildingObj?.name : null);

                            return (
                                <div 
                                    key={idx}
                                    className={`aero-schedule-row ${item.is_break ? 'is-break' : ''} ${item.isMarked ? 'is-marked' : ''} ${isP1CutoffAbsent ? 'is-absent' : ''} ${isCurrentActive ? 'is-active-now' : ''}`}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="row-p-title">{item.name}</span>
                                            {isCurrentActive && (
                                                <span className="period-now-badge">
                                                    LIVE NOW
                                                </span>
                                            )}
                                        </div>
                                        <div className="row-p-time">
                                            {item.start_time.slice(0, 5)} – {item.end_time.slice(0, 5)}
                                            {roomBuilding && (
                                                <span style={{ color: 'var(--text-sub)', marginLeft: '6px' }}>• {roomBuilding}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        {item.is_break ? (
                                            <span className="aero-status-tag break">Interval</span>
                                        ) : (item.isMarked && (item.attendance?.status === 'od' || item.status === 'od' || activeSportsPass)) ? (
                                            <span className="aero-status-tag present" style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #F59E0B', fontWeight: 800 }}>
                                                Sports OD Exemption
                                            </span>
                                        ) : item.isMarked ? (
                                            <span className="aero-status-tag present" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                <CheckCircle2 size={13} color="#16A34A" />
                                                <span>Present in Room {roomNum || '101'}</span>
                                            </span>
                                        ) : isP1CutoffAbsent ? (
                                            <span className="aero-status-tag absent" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #EF4444' }}>
                                                Absent (Cutoff 9:05)
                                            </span>
                                        ) : isCurrentActive ? (
                                            <span className="aero-status-tag pending" style={{ background: '#EFF6FF', color: 'var(--blue)', border: '1px solid #93C5FD', fontWeight: 800 }}>
                                                Awaiting OTP Verification
                                            </span>
                                        ) : (
                                            <span className="aero-status-tag pending">Upcoming</span>
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
