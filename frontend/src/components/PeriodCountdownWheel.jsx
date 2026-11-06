import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

const timeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
};

const getIstNowSeconds = () => {
    try {
        const parts = new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).formatToParts(new Date());

        const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
        const s = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
        return h * 3600 + m * 60 + s;
    } catch (e) {
        const d = new Date();
        return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    }
};

export const PeriodCountdownWheel = ({ currentPeriodInfo, timeline }) => {
    const [, setSecondsTick] = useState(0);

    // Live continuous 1-second interval to guarantee smooth real-time ticking
    useEffect(() => {
        const interval = setInterval(() => {
            setSecondsTick(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const simulatedTime = localStorage.getItem('fxec_simulated_time');
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
    let isUrgent = false;

    // Always use real-time IST continuous seconds unless Principal master simulation is active
    const nowSec = simulatedTime ? timeToSeconds(simulatedTime) : getIstNowSeconds();

    if (activePeriod) {
        const startSec = timeToSeconds(activePeriod.start_time);
        const endSec = timeToSeconds(activePeriod.end_time);
        const durationSec = Math.max(1, endSec - startSec);
        const elapsedSec = Math.min(durationSec, Math.max(0, nowSec - startSec));
        const remainingSec = Math.max(0, endSec - nowSec);

        const m = Math.floor(remainingSec / 60);
        const s = remainingSec % 60;
        displayTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        progressPct = Math.min(100, Math.max(0, (elapsedSec / durationSec) * 100));

        if (remainingSec <= 300) {
            isUrgent = true;
        }

        if (isBreak) {
            labelSub = `${activePeriod.name.toUpperCase()} INTERVAL`;
        } else {
            labelSub = `${activePeriod.name.toUpperCase()} DURATION`;
        }
    } else if (isBeforeCollege) {
        // Before college hours (9:00 AM)
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

    // SVG Circular Geometry: 290x290 container, radius 120, stroke 18 (broad, bold, prominent circle)
    const radius = 120;
    const strokeWidth = 18;
    const circumference = 2 * Math.PI * radius; // ≈ 753.98
    const strokeDashoffset = circumference - (circumference * progressPct) / 100;

    const isLongTime = displayTime.length >= 7; // e.g. "05:10:59"

    return (
        <div className="period-wheel-pure">
            {/* Circular Progress Wheel */}
            <div className="countdown-wheel-container">
                <div className="countdown-svg-wrap">
                    <svg className="countdown-svg" viewBox="0 0 290 290">
                        {/* Background Light Blue Track */}
                        <circle
                            className="countdown-circle-track"
                            cx="145"
                            cy="145"
                            r={radius}
                            stroke="#E8F4FC"
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        {/* Light Green Live Border Arc Moving along to the Period */}
                        <circle
                            className="countdown-circle-progress"
                            cx="145"
                            cy="145"
                            r={radius}
                            stroke="#C3F84A"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                        />
                    </svg>

                    {/* Centered Timer Inside Circle - Sized cleanly so it never spills out */}
                    <div className="countdown-inner-content">
                        <div className={`countdown-time-digits ${isLongTime ? 'long-digits' : 'standard-digits'}`}>
                            {displayTime}
                        </div>
                        <div className="countdown-label-sub">
                            {labelSub}
                        </div>
                        {isUrgent && activePeriod && (
                            <span className="count-pill orange" style={{ marginTop: '4px', fontSize: '0.65rem' }}>
                                Ending Soon
                            </span>
                        )}
                        {isCurrentMarked && (
                            <span className="count-pill green" style={{ marginTop: '4px', fontSize: '0.68rem' }}>
                                Marked Present
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

            {/* Post-Lunch 1:30 - 1:35 PM Window Notification */}
            {currentPeriodInfo?.isLunchWindow && (
                <div className="alert-box-warning" style={{ marginTop: '8px', maxWidth: '360px', margin: '8px auto 0' }}>
                    <AlertCircle size={16} />
                    <span><strong>1:30 – 1:35 PM Post-Lunch Window:</strong> Submit 5th period OTP now.</span>
                </div>
            )}
        </div>
    );
};
