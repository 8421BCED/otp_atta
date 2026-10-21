import React, { useState, useEffect } from 'react';
import { 
    MapPin, KeyRound, ShieldAlert, ShieldCheck, CheckCircle2, 
    ArrowRightLeft, Clock, History, AlertCircle, Sparkles 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const StudentDashboard = ({ 
    currentUser, 
    hierarchy, 
    currentPeriodInfo, 
    deviceInfo, 
    simulatedTime 
}) => {
    // Location selection state
    const [selectedBuilding, setSelectedBuilding] = useState(1);
    const [selectedFloor, setSelectedFloor] = useState(3); // 2nd Floor
    const [selectedRoom, setSelectedRoom] = useState(3);   // Room 207

    // OTP Input State
    const [otpInput, setOtpInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    // Timeline and movements
    const [timeline, setTimeline] = useState([]);
    const [movements, setMovements] = useState([]);
    const [totalPresent, setTotalPresent] = useState(0);

    // Fetch timeline
    const loadTimeline = async () => {
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch(`http://localhost:5000/api/attendance/student-timeline/${currentUser.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.timeline) {
                setTimeline(data.timeline);
                setMovements(data.movements || []);
                setTotalPresent(data.totalPresent || 0);
            }
        } catch (e) {
            console.error('Failed to load timeline:', e);
        }
    };

    useEffect(() => {
        loadTimeline();
        const interval = setInterval(loadTimeline, 5000);
        return () => clearInterval(interval);
    }, [currentUser.id]);

    // Handle Building change
    const activeBuildingObj = hierarchy?.find(b => b.id === Number(selectedBuilding));
    const availableFloors = activeBuildingObj?.floors || [];
    const activeFloorObj = availableFloors.find(f => f.id === Number(selectedFloor));
    const availableRooms = activeFloorObj?.rooms || [];
    const activeRoomObj = availableRooms.find(r => r.id === Number(selectedRoom));

    // Handle OTP Submission
    const handleSubmitOtp = async (e) => {
        e.preventDefault();
        setErrorMessage(null);
        setStatusMessage(null);

        if (!otpInput || otpInput.trim().length !== 6) {
            setErrorMessage('Please enter a valid 6-digit OTP code.');
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
                setStatusMessage('🎉 Attendance marked successfully for this period!');
                setOtpInput('');
                confetti({
                    particleCount: 80,
                    spread: 70,
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

    // Handle Lab / Class Relocation
    const handleRoomRelocate = async (targetRoomId) => {
        setSelectedRoom(targetRoomId);
        try {
            const token = localStorage.getItem('fxec_token');
            await fetch('http://localhost:5000/api/attendance/move-room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    toRoomId: targetRoomId,
                    periodId: currentPeriodInfo?.activePeriod?.id || 1,
                    note: 'Relocated to practical lab / class'
                })
            });
            setStatusMessage(`Relocated to room. Please enter the fresh OTP from the staff in that room.`);
            loadTimeline();
        } catch (e) {
            console.error('Error relocating:', e);
        }
    };

    return (
        <div className="dashboard-grid-wide">
            {/* Left Column: Attendance Action Center */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* 1. Morning 9:00 - 9:05 AM Day-Start Warning Banner */}
                {currentPeriodInfo?.isMorningWindow && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)',
                        border: '2px solid var(--fxec-gold)',
                        borderRadius: '14px',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        boxShadow: '0 0 20px rgba(255, 184, 0, 0.3)'
                    }}>
                        <Sparkles size={28} color="var(--fxec-gold)" />
                        <div>
                            <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1rem' }}>
                                🔔 9:00 AM – 9:05 AM DAY-START VERIFICATION ACTIVE
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#FEF3C7', marginTop: '2px' }}>
                                You must submit your 1st period OTP within this 5-minute window to initialize today's college attendance.
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Step 1: Location Hierarchy Picker */}
                <div className="fx-card fx-card-gold-accent">
                    <div className="fx-card-header">
                        <div>
                            <div className="fx-card-title">
                                <MapPin color="var(--fxec-gold)" size={22} />
                                Step 1: Select Your Current Location
                            </div>
                            <div className="fx-card-subtitle">
                                Confirm the Building, Floor, and Classroom/Lab you have arrived at
                            </div>
                        </div>
                        <span className="current-location-chip" style={{ padding: '6px 14px' }}>
                            <span style={{ fontSize: '0.78rem', color: '#93C5FD', fontWeight: 600 }}>Active Room:</span>
                            <strong style={{ marginLeft: '6px', color: 'var(--fxec-gold)', fontSize: '1.05rem' }}>
                                {activeRoomObj ? `Room ${activeRoomObj.room_number}` : 'Select Room'}
                            </strong>
                        </span>
                    </div>

                    <div className="location-picker-group">
                        {/* Building */}
                        <div className="picker-col">
                            <label className="picker-label">1. Building</label>
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
                                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                                ))}
                            </select>
                        </div>

                        {/* Floor */}
                        <div className="picker-col">
                            <label className="picker-label">2. Floor</label>
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

                        {/* Classroom / Room */}
                        <div className="picker-col">
                            <label className="picker-label">3. Classroom / Lab Number</label>
                            <select 
                                className="fx-select"
                                value={selectedRoom}
                                onChange={(e) => setSelectedRoom(Number(e.target.value))}
                            >
                                {availableRooms.map(r => (
                                    <option key={r.id} value={r.id}>
                                        Room {r.room_number} - {r.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Quick Classroom / Lab Switchers */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#93C5FD', fontWeight: 600 }}>Quick Switch:</span>
                        <button 
                            type="button"
                            className="role-btn" 
                            style={{ background: selectedRoom === 3 ? 'var(--fxec-gold)' : 'rgba(255,255,255,0.06)', color: selectedRoom === 3 ? '#07172F' : '#FFF' }}
                            onClick={() => { setSelectedBuilding(1); setSelectedFloor(3); setSelectedRoom(3); }}
                        >
                            Room 207 (IT Lecture Hall)
                        </button>
                        <button 
                            type="button"
                            className="role-btn" 
                            style={{ background: selectedRoom === 6 ? 'var(--fxec-gold)' : 'rgba(255,255,255,0.06)', color: selectedRoom === 6 ? '#07172F' : '#FFF' }}
                            onClick={() => { setSelectedBuilding(4); setSelectedFloor(5); setSelectedRoom(6); }}
                        >
                            Applied AI & ML Lab (AL-01)
                        </button>
                        <button 
                            type="button"
                            className="role-btn" 
                            style={{ background: selectedRoom === 7 ? 'var(--fxec-gold)' : 'rgba(255,255,255,0.06)', color: selectedRoom === 7 ? '#07172F' : '#FFF' }}
                            onClick={() => { setSelectedBuilding(4); setSelectedFloor(6); setSelectedRoom(7); }}
                        >
                            Cloud Computing Lab (AL-02)
                        </button>
                    </div>
                </div>

                {/* 3. Step 2: 10-Second OTP Verification Form */}
                <div className="fx-card fx-card-gold-accent">
                    <div className="fx-card-header">
                        <div>
                            <div className="fx-card-title">
                                <KeyRound color="var(--fxec-gold)" size={22} />
                                Step 2: Enter Classroom OTP
                            </div>
                            <div className="fx-card-subtitle">
                                The faculty in {activeRoomObj ? `Room ${activeRoomObj.room_number}` : 'your class'} displays a 10-second rolling code
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmitOtp} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <input
                                type="text"
                                maxLength="6"
                                placeholder="000000"
                                className="otp-input-field"
                                value={otpInput}
                                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                autoFocus
                            />
                            <div style={{ fontSize: '0.8rem', color: varCssMuted(), marginTop: '8px' }}>
                                OTP regenerates every 10 seconds on the faculty screen
                            </div>
                        </div>

                        {/* Status / Error Alerts */}
                        {statusMessage && (
                            <div style={{
                                width: '100%',
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid var(--fxec-emerald)',
                                borderRadius: '10px',
                                padding: '12px 16px',
                                color: '#34D399',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <CheckCircle2 size={20} />
                                {statusMessage}
                            </div>
                        )}

                        {errorMessage && (
                            <div style={{
                                width: '100%',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid var(--fxec-rose)',
                                borderRadius: '10px',
                                padding: '12px 16px',
                                color: '#F87171',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <AlertCircle size={20} />
                                {errorMessage}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="fx-btn-primary" 
                            style={{ width: '100%', maxWidth: '380px' }}
                            disabled={isSubmitting || otpInput.length !== 6}
                        >
                            {isSubmitting ? 'Verifying...' : 'Verify OTP & Check-in'}
                        </button>
                    </form>
                </div>

                {/* 4. Lab / Room Movement Timeline Notice */}
                <div style={{
                    background: 'rgba(17, 34, 64, 0.6)',
                    border: '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.82rem',
                    color: '#94A3B8'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ArrowRightLeft size={18} color="var(--fxec-cyan)" />
                        <span>Need to change classes or shift to a computer lab? Select the new room above and enter the new faculty's OTP.</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        *Movement is unrecorded during 10:40 AM & 12:40 PM breaks
                    </span>
                </div>
            </div>

            {/* Right Column: Today's Period Schedule & Device Anti-Proxy Security */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Anti-Proxy Device Locking Card */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <ShieldCheck color="var(--fxec-emerald)" size={22} />
                            Device Anti-Proxy Security
                        </div>
                        <span className="badge-present">LOCKED & BOUND</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                            <span style={{ color: '#94A3B8' }}>Registered Device:</span>
                            <strong style={{ color: '#FFF' }}>{deviceInfo?.deviceName || 'Samsung Galaxy A35'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                            <span style={{ color: '#94A3B8' }}>Platform:</span>
                            <span style={{ color: '#FFF' }}>{deviceInfo?.platform || 'Android Mobile'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                            <span style={{ color: '#94A3B8' }}>Screen / Hardware Hash:</span>
                            <span style={{ color: 'var(--fxec-gold)', fontFamily: 'monospace' }}>
                                {deviceInfo?.fingerprint ? deviceInfo.fingerprint.slice(0, 16) + '...' : 'SEC_HASH_VALID'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94A3B8' }}>Proxy Prevention:</span>
                            <span style={{ color: '#34D399', fontWeight: 700 }}>Active (Strict 1-Device Lock)</span>
                        </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.4 }}>
                        If you change smartphones or lose your phone, visit the HOD office to request an authorized device lock reset.
                    </div>
                </div>

                {/* Today's Schedule & Attendance Timeline */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div>
                            <div className="fx-card-title">
                                <Clock color="var(--fxec-gold)" size={22} />
                                Today's Period Schedule (Dismissal 4:05 PM)
                            </div>
                            <div className="fx-card-subtitle">
                                {totalPresent} of 7 Periods Attended Today
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '440px', overflowY: 'auto' }}>
                        {timeline.map((item, idx) => (
                            <div 
                                key={idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    background: item.is_break 
                                        ? 'rgba(255,255,255,0.02)' 
                                        : (item.isMarked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(7, 23, 47, 0.6)'),
                                    border: item.isMarked 
                                        ? '1px solid rgba(16, 185, 129, 0.3)' 
                                        : '1px solid rgba(255,255,255,0.06)'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: item.is_break ? '#94A3B8' : '#FFF' }}>
                                        {item.name}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                        {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                                    </div>
                                </div>

                                <div>
                                    {item.is_break ? (
                                        <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>Break / Lunch</span>
                                    ) : item.isMarked ? (
                                        <span className="badge-present">
                                            ✓ Present ({item.attendance?.room_number ? `Rm ${item.attendance.room_number}` : 'Room 207'})
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '0.75rem', color: '#F87171', fontWeight: 600 }}>
                                            Pending OTP
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

function varCssMuted() {
    return '#94A3B8';
}
