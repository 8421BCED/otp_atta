import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const timeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
};

export const PeriodCountdownWheel = ({ currentPeriodInfo, timeline }) => {
    const [secondsTick, setSecondsTick] = useState(0);

    // Live 1-second interval to keep the timer smoothly counting down
    useEffect(() => {
        const interval = setInterval(() => {
            setSecondsTick(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const currentTimeStr = currentPeriodInfo?.currentTime;
    const activePeriod = currentPeriodInfo?.activePeriod;
    const isBreak = currentPeriodInfo?.isBreak;
    const isBeforeCollege = currentPeriodInfo?.isBeforeCollege;
    const isAfterCollege = currentPeriodInfo?.isAfterCollege;
    const isMorningWindow = currentPeriodInfo?.isMorningWindow;

    // Derive current active period attendance status from timeline
    const markedPeriod = activePeriod ? timeline?.find(t => t.id === activePeriod.id && t.isMarked) : null;
    const isCurrentMarked = !!markedPeriod;

    // Calculate countdown metrics
    let displayTime = '--:--';
    let progressPct = 0;
    let labelSub = 'PERIOD TIME';
    let periodTitle = 'No Active Period';
    let periodTiming = 'College Hours: 09:00 AM – 04:05 PM';
    let nextEvent = 'Next: Period';
    let elapsedMinutes = 0;
    let totalMinutes = 0;

    if (currentTimeStr) {
        const nowSec = timeToSeconds(currentTimeStr);

        if (isBeforeCollege) {
            const startSec = timeToSeconds('09:00:00');
            const diffSec = Math.max(0, startSec - nowSec);
            const m = Math.floor(diffSec / 60);
            const s = diffSec % 60;
            displayTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            labelSub = 'UNTIL COLLEGE STARTS';
            periodTitle = 'Before College Hours';
            periodTiming = '1st Period begins at 09:00 AM';
            nextEvent = 'Dismissal: 04:05 PM';
            progressPct = 0;
        } else if (isAfterCollege) {
            displayTime = '00:00';
            labelSub = 'COLLEGE DISMISSED';
            periodTitle = 'College Day Concluded';
            periodTiming = 'Official Dismissal at 04:05 PM';
            nextEvent = 'See you tomorrow at 09:00 AM';
            progressPct = 100;
        } else if (activePeriod) {
            const startSec = timeToSeconds(activePeriod.start_time);
            const endSec = timeToSeconds(activePeriod.end_time);
            const durationSec = Math.max(1, endSec - startSec);
            const elapsedSec = Math.min(durationSec, Math.max(0, nowSec - startSec));
            const remainingSec = Math.max(0, endSec - nowSec);

            const m = Math.floor(remainingSec / 60);
            const s = remainingSec % 60;
            displayTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            progressPct = Math.min(100, Math.round((elapsedSec / durationSec) * 100));

            elapsedMinutes = Math.floor(elapsedSec / 60);
            totalMinutes = Math.round(durationSec / 60);

            if (isBreak) {
                labelSub = 'BREAK REMAINING';
                periodTitle = activePeriod.name;
                periodTiming = `${activePeriod.start_time.slice(0, 5)} – ${activePeriod.end_time.slice(0, 5)} (Interval)`;
                nextEvent = 'Classes resume after interval';
            } else {
                labelSub = 'TIME REMAINING';
                periodTitle = activePeriod.name;
                periodTiming = `${activePeriod.start_time.slice(0, 5)} – ${activePeriod.end_time.slice(0, 5)}`;
                nextEvent = `Dismissal: 04:05 PM`;
            }
        }
    }

    // SVG Circular Arc Geometry
    const radius = 74;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius; // ≈ 464.95
    const strokeDashoffset = circumference - (circumference * progressPct) / 100;

    return (
        <div className="countdown-hero-card">
            <div className="fx-card-header">
                <div className="fx-card-title">
                    <Clock size={18} />
                    <span>Period Countdown & Status</span>
                </div>
                {isCurrentMarked ? (
                    <span className="count-pill green">
                        ✓ Present (Rm {markedPeriod.attendance?.room_number || '207'})
                    </span>
                ) : isBreak ? (
                    <span className="count-pill">
                        Official Interval
                    </span>
                ) : activePeriod ? (
                    <span className="count-pill">
                        Attendance Pending
                    </span>
                ) : (
                    <span className="count-pill">
                        Dismissal 4:05 PM
                    </span>
                )}
            </div>

            {/* Circular Progress Wheel */}
            <div className="countdown-wheel-container">
                <div className="countdown-svg-wrap">
                    <svg className="countdown-svg" viewBox="0 0 190 190">
                        {/* Track */}
                        <circle
                            className="countdown-circle-track"
                            cx="95"
                            cy="95"
                            r={radius}
                        />
                        {/* Animated Progress Arc */}
                        <circle
                            className="countdown-circle-progress"
                            cx="95"
                            cy="95"
                            r={radius}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                        />
                    </svg>

                    {/* Inside Center Info */}
                    <div className="countdown-inner-content">
                        <div className="countdown-time-digits">{displayTime}</div>
                        <div className="countdown-label-sub">{labelSub}</div>
                    </div>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="countdown-metrics-bar">
                <div className="countdown-metric-col">
                    <span className="countdown-metric-label">Current Period</span>
                    <span className="countdown-metric-val highlight">{periodTitle}</span>
                </div>
                <div className="countdown-metric-col">
                    <span className="countdown-metric-label">Timing</span>
                    <span className="countdown-metric-val">{periodTiming}</span>
                </div>
                <div className="countdown-metric-col">
                    <span className="countdown-metric-label">Completion</span>
                    <span className="countdown-metric-val">{progressPct}% Elapsed</span>
                </div>
            </div>

            {/* Morning 9:00 - 9:05 Window Notification */}
            {isMorningWindow && (
                <div className="alert-box-warning" style={{ marginTop: '4px' }}>
                    <AlertCircle size={17} />
                    <span><strong>9:00 – 9:05 AM Day-Start Window:</strong> Submit 1st period OTP now to initialize your day.</span>
                </div>
            )}
        </div>
    );
};
