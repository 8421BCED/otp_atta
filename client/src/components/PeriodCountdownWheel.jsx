import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

const timeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
};

export const PeriodCountdownWheel = ({ currentPeriodInfo, timeline }) => {
    const [, setSecondsTick] = useState(0);

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

    // Calculate period timer and progress
    let displayTime = '--:--';
    let progressPct = 0;
    let labelSub = 'PERIOD DURATION';

    if (currentTimeStr) {
        const nowSec = timeToSeconds(currentTimeStr);

        if (activePeriod) {
            const startSec = timeToSeconds(activePeriod.start_time);
            const endSec = timeToSeconds(activePeriod.end_time);
            const durationSec = Math.max(1, endSec - startSec);
            const elapsedSec = Math.min(durationSec, Math.max(0, nowSec - startSec));
            const remainingSec = Math.max(0, endSec - nowSec);

            const m = Math.floor(remainingSec / 60);
            const s = remainingSec % 60;
            displayTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            progressPct = Math.min(100, Math.round((elapsedSec / durationSec) * 100));

            if (isBreak) {
                labelSub = `${activePeriod.name.toUpperCase()} INTERVAL`;
            } else {
                labelSub = `${activePeriod.name.toUpperCase()} DURATION`;
            }
        } else if (isBeforeCollege) {
            // Before college hours (9:00 AM) - format cleanly as HH:MM:SS or opening time
            const startSec = timeToSeconds('09:00:00');
            const diffSec = Math.max(0, startSec - nowSec);
            const h = Math.floor(diffSec / 3600);
            const m = Math.floor((diffSec % 3600) / 60);
            const s = diffSec % 60;

            if (h > 0) {
                displayTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            } else {
                displayTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
            labelSub = 'COLLEGE OPENS AT 9:00 AM';
            progressPct = 0;
        } else if (isAfterCollege) {
            displayTime = '00:00';
            labelSub = 'COLLEGE DISMISSED (4:05 PM)';
            progressPct = 100;
        }
    }

    // SVG Circular Geometry with thicker green progress stroke
    const radius = 72;
    const strokeWidth = 11;
    const circumference = 2 * Math.PI * radius; // ≈ 452.39
    const strokeDashoffset = circumference - (circumference * progressPct) / 100;

    return (
        <div className="period-wheel-pure">
            {/* Circular Progress Wheel */}
            <div className="countdown-wheel-container">
                <div className="countdown-svg-wrap">
                    <svg className="countdown-svg" viewBox="0 0 190 190">
                        {/* Background Track Circle */}
                        <circle
                            className="countdown-circle-track"
                            cx="95"
                            cy="95"
                            r={radius}
                            stroke="#E8F4FC"
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        {/* Thick Green Period Duration Arc */}
                        <circle
                            className="countdown-circle-progress"
                            cx="95"
                            cy="95"
                            r={radius}
                            stroke="#C3F84A"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                        />
                    </svg>

                    {/* Centered Timer Inside Circle */}
                    <div className="countdown-inner-content">
                        <div className="countdown-time-digits">{displayTime}</div>
                        <div className="countdown-label-sub">{labelSub}</div>
                        {isCurrentMarked && (
                            <span className="count-pill green" style={{ marginTop: '6px', fontSize: '0.7rem' }}>
                                ✓ Marked Present
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Morning 9:00 - 9:05 Window Notification */}
            {isMorningWindow && (
                <div className="alert-box-warning" style={{ marginTop: '8px', maxWidth: '360px', margin: '8px auto 0' }}>
                    <AlertCircle size={16} />
                    <span><strong>9:00 – 9:05 AM Day-Start Window:</strong> Submit 1st period OTP now.</span>
                </div>
            )}
        </div>
    );
};
