import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, CheckCircle2, AlertCircle, Navigation, Lock, Trophy, RotateCw, ChevronRight, FileText, CalendarOff, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PeriodCountdownWheel } from './PeriodCountdownWheel';
import { RoomSelectionModal } from './RoomSelectionModal';
import { usePolling } from '../hooks';
import { useClock } from '../clock';

const greeting = () => {
    const hour = Number(
        new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date())
    ) % 24;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};

// Six visual cells over one real input, so the numeric keypad and autofill both work.
const OtpField = ({ value, onChange, autoFocus, label }) => {
    const ref = useRef(null);
    useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);
    return (
        <div className="otp-cells" onClick={() => ref.current && ref.current.focus()}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                    key={i}
                    className={`otp-cell ${value[i] ? 'is-filled' : ''} ${i === value.length ? 'is-cursor' : ''}`}
                >
                    {value[i] || ''}
                </div>
            ))}
            <input
                ref={ref}
                className="otp-hidden"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                aria-label={label}
                value={value}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
        </div>
    );
};

export const StudentDashboard = ({
    currentUser,
    hierarchy,
    currentPeriodInfo,
    deviceInfo,
    simulatedTime,
    selectedRoom: propSelectedRoom,
    onSelectRoom: propOnSelectRoom,
    onOpenLeave,
    onOpenClassroom
}) => {
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedFloor, setSelectedFloor] = useState(null);
    const [localSelectedRoom, setLocalSelectedRoom] = useState(null);

    const selectedRoom = propSelectedRoom !== undefined ? propSelectedRoom : localSelectedRoom;
    const setSelectedRoom = propOnSelectRoom || setLocalSelectedRoom;

    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [activeSportsPass, setActiveSportsPass] = useState(null);

    const [otpInput, setOtpInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    const [timeline, setTimeline] = useState([]);
    const [totalPresent, setTotalPresent] = useState(0);
    // Everything about today's rules comes from the server, so the screen can never disagree with it.
    const [dayState, setDayState] = useState({ isDayLocked: false, lockSession: null, lockReopensAt: null, dayOff: null, exemptEvent: null, isHodUnlocked: false });

    const loadTimeline = useCallback(async () => {
        if (!currentUser?.id) return;
        try {
            const res = await fetch(`/api/attendance/student-timeline/${currentUser.id}`);
            const data = await res.json();
            if (data.timeline) {
                setTimeline(data.timeline);
                setTotalPresent(data.totalPresent || 0);
                setActiveSportsPass(data.activeSportsPass || null);
                setDayState({
                    isDayLocked: !!data.isDayLocked,
                    lockSession: data.lockSession || null,
                    lockReopensAt: data.lockReopensAt || null,
                    dayOff: data.dayOff || null,
                    exemptEvent: data.exemptEvent || null,
                    isHodUnlocked: !!data.isHodUnlocked
                });
            }
        } catch (e) {
            console.error('Failed to load timeline:', e);
        }
    }, [currentUser?.id]);

    // Every 15 seconds while the screen is open and visible, and again the moment the tab comes back.
    usePolling(loadTimeline, 15000, !!currentUser?.id);
    // Resolve building / floor / room objects from the hierarchy
    const activeBuildingObj = selectedBuilding ? hierarchy?.find((b) => b.id === Number(selectedBuilding)) : null;
    const availableFloors = activeBuildingObj?.floors || [];
    const activeFloorObj = selectedFloor ? availableFloors.find((f) => f.id === Number(selectedFloor)) : null;
    const availableRooms = activeFloorObj?.rooms || [];
    const activeRoomObj = selectedRoom ? availableRooms.find((r) => r.id === Number(selectedRoom)) : null;

    const isDayLocked = !activeSportsPass && !dayState.dayOff && dayState.isDayLocked;
    const isMorningLocked = isDayLocked && dayState.lockSession === 'morning';
    const isLunchLocked = isDayLocked && dayState.lockSession === 'afternoon';
    const isHodUnlocked = dayState.isHodUnlocked;
    // College time from the synced clock. It ticks locally, so it keeps running on a slow network.
    const clock = useClock();
    const nowT = simulatedTime || clock.time;

    // The moment a boundary passes (a period starts or ends, 9:05, 1:35), refresh the rules from the server.
    // The delay is random so thousands of phones do not all ask in the same second.
    const lastSeen = useRef(nowT);
    useEffect(() => {
        const before = lastSeen.current;
        lastSeen.current = nowT;
        if (!timeline.length || nowT <= before) return;
        const marks = ['09:05:00', '13:35:00', ...timeline.filter((p) => !p.is_break).flatMap((p) => [p.start_time, p.end_time])];
        if (marks.some((m) => before < m && nowT >= m)) {
            setTimeout(loadTimeline, 400 + Math.random() * 3000);
        }
    }, [nowT]); // eslint-disable-line react-hooks/exhaustive-deps
    // Target period: live period, else first non-break period
    const effectiveActivePeriod = currentPeriodInfo?.activePeriod
        || timeline?.find((p) => !p.is_break && p.isMarked)
        || timeline?.find((p) => !p.is_break)
        || currentPeriodInfo?.allPeriods?.find((p) => !p.is_break)
        || null;

    const activePeriodId = effectiveActivePeriod?.id || 1;
    const activePeriodNumber = effectiveActivePeriod?.period_number || 1;

    const currentPeriodItem = timeline?.find((p) => p.id === activePeriodId);
    const isCurrentPeriodMarked = !!currentPeriodItem?.isMarked;
    const markedRoomId = currentPeriodItem?.attendance?.room_id;
    const markedRoomNumber = currentPeriodItem?.attendance?.room_number;

    const isRelocating = isCurrentPeriodMarked && selectedRoom && markedRoomId && Number(selectedRoom) !== Number(markedRoomId);

    // Sync the picked room to the room already recorded in the database
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

        const b = hierarchy?.find((x) => x.id === Number(bId));
        const f = b?.floors?.find((x) => x.id === Number(fId));
        const r = f?.rooms?.find((x) => x.id === Number(rId));

        if (markedRoomId && Number(rId) !== Number(markedRoomId)) {
            setStatusMessage(`Moving to room ${r ? r.room_number : rId}. Enter the check-in code shown there.`);
        } else {
            setStatusMessage(`Classroom set to room ${r ? r.room_number : rId}.`);
        }
        setTimeout(() => setStatusMessage(null), 4000);
    };

    const handleSubmitOtp = async (e) => {
        e.preventDefault();
        setErrorMessage(null);
        setStatusMessage(null);

        if (!selectedRoom) {
            setErrorMessage('Choose your classroom before entering the code.');
            setIsRoomModalOpen(true);
            return;
        }
        if (isDayLocked) {
            setErrorMessage(dayState.lockSession === 'morning'
                ? 'You are marked absent for the morning. Attendance reopens after lunch.'
                : 'Your attendance is locked. Meet your HOD to unlock it.');
            return;
        }
        if (!otpInput || otpInput.trim().length !== 6) {
            setErrorMessage('Enter the 6-digit code shown by your faculty.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/attendance/submit-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: selectedRoom,
                    otpCode: otpInput.trim(),
                    currentTime: simulatedTime || null
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setStatusMessage(data.message || 'Attendance recorded.');
                setOtpInput('');

                const targetPId = data.periodId || activePeriodId;
                setTimeline((prev) => prev.map((p) => (p.id === targetPId
                    ? {
                        ...p,
                        isMarked: true,
                        status: 'present',
                        attendance: {
                            period_id: targetPId,
                            room_id: selectedRoom,
                            room_number: activeRoomObj?.room_number || String(selectedRoom),
                            status: 'present'
                        }
                    }
                    : p)));
                setTotalPresent((prev) => prev + 1);
                loadTimeline();

                try {
                    confetti({ particleCount: 55, spread: 58, origin: { y: 0.72 }, colors: ['#5798D7', '#B9C255', '#E6F1FA'] });
                } catch (err) { /* effect is optional */ }

                setTimeout(() => setStatusMessage(null), 4000);
            } else {
                setErrorMessage(data.message || data.error || 'That code was not accepted. Check your faculty screen.');
                if (data.code === 'DAY_LOCKED_OUT' || data.code === 'NO_CLASSES') loadTimeline();
            }
        } catch (err) {
            console.error('OTP submit error:', err);
            setErrorMessage('Could not reach the attendance server. Try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const firstName = (currentUser?.name || 'there').trim().split(/\s+/)[0];
    const roomLabel = activeRoomObj?.room_number || markedRoomNumber || selectedRoom;

    // ---- Feedback blocks reused by the OTP states ----
    const Messages = () => (
        <>
            {statusMessage && (
                <div className="ui-alert ui-alert--success" role="status">
                    <CheckCircle2 size={18} />
                    <span>{statusMessage}</span>
                </div>
            )}
            {errorMessage && (
                <div className="ui-alert ui-alert--danger" role="alert">
                    <AlertCircle size={18} />
                    <span>{errorMessage}</span>
                </div>
            )}
        </>
    );

    const renderAction = () => {
        if (activeSportsPass) {
            return (
                <div className="state-panel state-panel--warn">
                    <div className="state-badge"><Trophy size={26} /></div>
                    <span className="ui-eyebrow" style={{ color: 'var(--warn-ink)' }}>Sports on-duty pass</span>
                    <h3>{activeSportsPass.event_name}</h3>
                    <p>{activeSportsPass.sport_category} at {activeSportsPass.venue}</p>
                    <div className="state-facts">
                        <div>Present is credited for every period covered by the pass.</div>
                        <div>No room code is needed while the pass is active.</div>
                        <div>The morning and afternoon locks do not apply to you today.</div>
                    </div>
                    <p className="u-small">Issued by {activeSportsPass.issued_by || 'the Director of Physical Education'}</p>
                </div>
            );
        }

        if (isRelocating) {
            return (
                <form onSubmit={handleSubmitOtp} className="otp-form">
                    <div className="u-row u-between">
                        <div className="u-row" style={{ gap: 10 }}>
                            <Navigation size={18} color="var(--denim-500)" />
                            <strong>Moving rooms</strong>
                        </div>
                        <span className="ui-chip">Arrival check</span>
                    </div>
                    <div className="state-facts" style={{ marginTop: -4 }}>
                        <div>Checked in: <strong>Room {markedRoomNumber || markedRoomId}</strong></div>
                        <div>
                            Moving to: <strong>Room {activeRoomObj ? activeRoomObj.room_number : selectedRoom}</strong>
                            {activeRoomObj ? ` (${activeRoomObj.name})` : ''}
                            <div className="u-small u-muted">{activeBuildingObj?.name} {activeFloorObj?.name ? `, ${activeFloorObj.name}` : ''}</div>
                        </div>
                    </div>
                    <OtpField value={otpInput} onChange={setOtpInput} autoFocus label="Room check-in code" />
                    <Messages />
                    <button type="submit" className="ui-btn ui-btn--primary ui-btn--block" disabled={isSubmitting || otpInput.length !== 6}>
                        {isSubmitting ? 'Verifying' : 'Verify arrival'}
                    </button>
                    <button
                        type="button"
                        className="ui-btn ui-btn--ghost ui-btn--sm ui-btn--block"
                        onClick={() => {
                            setSelectedRoom(markedRoomId);
                            hierarchy?.forEach((b) => b.floors?.forEach((f) => f.rooms?.forEach((r) => {
                                if (Number(r.id) === Number(markedRoomId)) {
                                    setSelectedBuilding(b.id);
                                    setSelectedFloor(f.id);
                                }
                            })));
                        }}
                    >
                        Stay in Room {markedRoomNumber || markedRoomId}
                    </button>
                </form>
            );
        }
        if (dayState.dayOff) {
            const weekend = dayState.dayOff.type === 'weekend';
            return (
                <div className="state-panel state-panel--info">
                    <div className="state-badge">{weekend ? <CalendarOff size={26} /> : <PartyPopper size={26} />}</div>
                    <h3>{weekend ? 'No classes today' : dayState.dayOff.title}</h3>
                    <p>{weekend ? 'Today is a weekly off. Enjoy the break.' : 'Today is a holiday. Attendance is not taken and nothing is locked.'}</p>
                </div>
            );
        }

        if (isDayLocked) {
            const lockedMorning = isMorningLocked;
            return (
                <div className="state-panel state-panel--danger">
                    <div className="state-badge"><Lock size={26} /></div>
                    <h3>{lockedMorning ? 'Absent for the morning' : 'Absent for the rest of the day'}</h3>
                    <p>
                        {lockedMorning
                            ? <>No code was entered between <strong>9:00 and 9:05 AM</strong>, so periods 1 to 4 are marked absent.</>
                            : isLunchLocked
                                ? <>No code was entered between <strong>1:30 and 1:35 PM</strong>, so the rest of the day is marked absent.</>
                                : <>Your HOD has locked your attendance for today.</>}
                    </p>
                    {lockedMorning && dayState.lockReopensAt && (
                        <div className="state-action">
                            <strong>It reopens after lunch.</strong> Enter the code again at {dayState.lockReopensAt.slice(0, 5)} for the afternoon periods.
                        </div>
                    )}
                    <div className="state-action">
                        <strong>Need it sooner?</strong> Meet your HOD in person. They can unlock your attendance from their dashboard.
                    </div>
                </div>
            );
        }
        if (isCurrentPeriodMarked) {
            return (
                <div className="state-panel state-panel--ok">
                    <div className="state-badge"><CheckCircle2 size={26} /></div>
                    <h3>Period {activePeriodNumber} recorded</h3>
                    <p>
                        You are marked <strong>present{currentPeriodItem?.attendance?.room_number ? ` in Room ${currentPeriodItem.attendance.room_number}` : ''}</strong>.
                    </p>
                    <div className="state-action">
                        Heading to a lab? Change your classroom above, then enter the code shown in that lab.
                    </div>
                </div>
            );
        }

        return (
            <form onSubmit={handleSubmitOtp} className="otp-form">
                {isHodUnlocked && (
                    <div className="ui-alert ui-alert--success">
                        <CheckCircle2 size={18} />
                        <span>Your HOD has unlocked attendance for today.</span>
                    </div>
                )}
                <OtpField
                    value={otpInput}
                    onChange={setOtpInput}
                    autoFocus={!!selectedRoom}
                    label="Six digit room code"
                />
                <div className="otp-hint">
                    {selectedRoom
                        ? `Enter the code on the screen in Room ${roomLabel}.`
                        : 'Choose your classroom first.'}
                </div>
                <Messages />
                <button type="submit" className="ui-btn ui-btn--primary ui-btn--block" disabled={isSubmitting || otpInput.length !== 6}>
                    {isSubmitting ? 'Verifying' : 'Mark me present'}
                </button>
            </form>
        );
    };

    const dayPeriods = timeline.filter((p) => !p.is_break);

    const inLockScope = (item) => {
        if (dayState.lockSession === 'morning') return item.period_number <= 4;
        if (dayState.lockSession === 'afternoon') return item.period_number >= 5;
        return dayState.lockSession === 'day';
    };

    const slotState = (item) => {
        const isLive = currentPeriodInfo?.activePeriod?.id === item.id;
        const roomNum = item.attendance?.room_number
            || (item.isMarked && item.id === activePeriodId ? (activeRoomObj?.room_number || selectedRoom) : null);
        const isOd = item.isMarked && (item.attendance?.status === 'od' || item.status === 'od' || activeSportsPass);
        if (isOd) return { tone: 'od', label: 'On duty', isLive };
        if (item.isMarked) return { tone: 'present', label: roomNum ? `Present, ${roomNum}` : 'Present', isLive };
        if (dayState.dayOff) return { tone: 'upcoming', label: dayState.dayOff.type === 'weekend' ? 'No classes' : 'Holiday', isLive: false };

        const started = !!nowT && item.start_time <= nowT;
        const finished = !!nowT && item.end_time <= nowT;
        if (isDayLocked && inLockScope(item)) return { tone: 'absent', label: started ? 'Absent' : 'Locked', isLive };
        if (finished) return { tone: 'absent', label: 'Absent', isLive: false };
        if (isLive) return { tone: 'live', label: 'Awaiting code', isLive };
        return { tone: 'upcoming', label: 'Upcoming', isLive };
    };
    return (
        <div className="day">
            {/* The whole day at a glance */}
            <section className="day-strip" aria-label="Today's periods">
                {dayPeriods.map((item) => {
                    const st = slotState(item);
                    return (
                        <div key={item.id} className={`day-slot day-slot--${st.tone} ${st.isLive ? 'is-live' : ''}`}>
                            <div className="day-slot-top">
                                <span className="day-slot-no">Period {item.period_number}</span>
                                {st.isLive && <span className="ui-dot ui-dot--live" />}
                            </div>
                            <div className="day-slot-time">{item.start_time.slice(0, 5)} to {item.end_time.slice(0, 5)}</div>
                            <div className="day-slot-state">{st.label}</div>
                        </div>
                    );
                })}
                {dayPeriods.length === 0 && <div className="u-muted u-small" style={{ padding: 16 }}>Loading your day.</div>}
            </section>

            <div className="day-main">
                {/* Focus: the one thing to do right now */}
                <section className="ui-card focus-card">
                    <div className="ui-card-head">
                        <div className="st-greet">
                            <h1>{greeting()}, {firstName}</h1>
                            <p>{currentUser?.department ? `${currentUser.department} department` : 'Student'}</p>
                        </div>
                    </div>

                    <div className="hero-body">
                        {!dayState.dayOff && <PeriodCountdownWheel currentPeriodInfo={currentPeriodInfo} timeline={timeline} />}

                        <div className="room-row">
                            <div className="room-icon"><MapPin size={19} /></div>
                            <div className="u-grow">
                                <div className="room-title">{roomLabel ? `Room ${roomLabel}` : 'No classroom selected'}</div>
                                <div className="room-meta u-truncate">
                                    {activeBuildingObj
                                        ? `${activeBuildingObj.name}${activeFloorObj ? `, ${activeFloorObj.name}` : ''}`
                                        : 'Pick the room you are sitting in'}
                                </div>
                            </div>
                            <button type="button" className="ui-btn ui-btn--sm" onClick={() => setIsRoomModalOpen(true)}>
                                {roomLabel ? 'Change' : 'Choose'}
                            </button>
                        </div>

                        {renderAction()}
                    </div>
                </section>

                {/* Side: summary and shortcuts */}
                <aside className="day-side">
                    <section className="ui-card ui-card--sm summary-card">
                        <div className="u-row u-between">
                            <span className="ui-eyebrow">Today</span>
                            <button type="button" className="ui-icon-btn" style={{ width: 36, height: 36, borderRadius: 12 }} onClick={loadTimeline} aria-label="Refresh attendance" title="Refresh">
                                <RotateCw size={16} />
                            </button>
                        </div>
                        <div className="summary-number"><strong>{totalPresent}</strong><span>of {dayPeriods.length || 7} periods marked</span></div>
                        <span className={`ui-chip ${isDayLocked ? 'ui-chip--danger' : 'ui-chip--present'}`} style={{ alignSelf: 'flex-start' }}>
                            <span className="ui-dot" />{isDayLocked ? 'Attendance locked' : 'Attendance open'}
                        </span>
                    </section>

                    <button type="button" className="pick-item" onClick={() => onOpenClassroom && onOpenClassroom()}>
                        <span className="icon-tile icon-tile--denim" style={{ width: 42, height: 42, borderRadius: 14 }}><MapPin size={19} /></span>
                        <div className="u-grow"><div className="pick-name">Browse classrooms</div><div className="pick-sub">Find a building, floor or lab</div></div>
                        <ChevronRight size={18} color="var(--ink-3)" />
                    </button>
                    <button type="button" className="pick-item" onClick={() => onOpenLeave && onOpenLeave()}>
                        <span className="icon-tile icon-tile--warn" style={{ width: 42, height: 42, borderRadius: 14 }}><FileText size={19} /></span>
                        <div className="u-grow"><div className="pick-name">Leave and On-Duty</div><div className="pick-sub">Apply or track an application</div></div>
                        <ChevronRight size={18} color="var(--ink-3)" />
                    </button>
                </aside>
            </div>
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





