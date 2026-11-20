import React from 'react';
import { useClock } from '../clock';
import { AlertCircle } from 'lucide-react';

const timeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
};

const pad = (n) => String(n).padStart(2, '0');

export const PeriodCountdownWheel = ({ currentPeriodInfo, timeline }) => {
    // Re-renders every second from the synced college clock, so the countdown never stalls and never drifts.
    const { time: clockTime } = useClock();

    let simulatedTime = null;
    try { simulatedTime = localStorage.getItem('fxec_simulated_time'); } catch (e) { /* ignore */ }

    const activePeriod = currentPeriodInfo?.activePeriod;
    const isBreak = currentPeriodInfo?.isBreak;
    const markedPeriod = activePeriod ? timeline?.find((t) => t.id === activePeriod.id && t.isMarked) : null;

    const nowSec = timeToSeconds(simulatedTime || clockTime);

    let display = '--:--';
    let caption = '';
    let sub = '';
    let pct = 0;
    let urgent = false;

    if (activePeriod) {
        const start = timeToSeconds(activePeriod.start_time);
        const end = timeToSeconds(activePeriod.end_time);
        const duration = Math.max(1, end - start);
        const elapsed = Math.min(duration, Math.max(0, nowSec - start));
        const remaining = Math.max(0, end - nowSec);
        display = `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`;
        pct = (elapsed / duration) * 100;
        urgent = remaining <= 300 && !isBreak;
        caption = activePeriod.name;
        sub = isBreak ? 'Interval, time left' : 'Time left in period';
    } else if (currentPeriodInfo?.isBeforeCollege) {
        const diff = Math.max(0, timeToSeconds('09:00:00') - nowSec);
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        display = h > 0 ? `${pad(h)}:${pad(m)}:${pad(diff % 60)}` : `${pad(m)}:${pad(diff % 60)}`;
        caption = 'Before college';
        sub = 'Classes begin at 9:00 AM';
    } else if (currentPeriodInfo?.isAfterCollege) {
        display = '00:00';
        pct = 100;
        caption = 'College closed';
        sub = 'Classes ended at 4:05 PM';
    }

    const radius = 104;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (circumference * pct) / 100;
    const stroke = urgent ? 'var(--warn)' : markedPeriod ? 'var(--pistachio-400)' : 'var(--denim-400)';

    return (
        <div className="ring-wrap">
            <div className="ring" role="timer" aria-label={`${caption} ${sub} ${display}`}>
                <svg viewBox="0 0 240 240" className="ring-svg" aria-hidden="true">
                    <circle cx="120" cy="120" r={radius} fill="none" stroke="var(--frost-300)" strokeWidth="12" opacity=".7" />
                    <circle
                        cx="120" cy="120" r={radius} fill="none"
                        stroke={stroke} strokeWidth="12" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset .9s linear, stroke .3s ease' }}
                    />
                </svg>
                <div className="ring-center">
                    <div className="ring-caption">{caption}</div>
                    <div className={`ring-digits ${display.length >= 7 ? 'is-long' : ''}`}>{display}</div>
                    <div className="ring-sub">{sub}</div>
                    {markedPeriod && <span className="ui-chip ui-chip--present" style={{ marginTop: 10 }}>Marked present</span>}
                    {!markedPeriod && urgent && <span className="ui-chip ui-chip--warn" style={{ marginTop: 10 }}>Ending soon</span>}
                </div>
            </div>

            {currentPeriodInfo?.isMorningWindow && (
                <div className="ui-alert ui-alert--warn" style={{ marginTop: 18 }}>
                    <AlertCircle size={18} />
                    <span><strong>Day-start window, 9:00 to 9:05 AM.</strong> Submit the first period code now.</span>
                </div>
            )}
            {currentPeriodInfo?.isLunchWindow && (
                <div className="ui-alert ui-alert--warn" style={{ marginTop: 18 }}>
                    <AlertCircle size={18} />
                    <span><strong>Post-lunch window, 1:30 to 1:35 PM.</strong> Submit the fifth period code now.</span>
                </div>
            )}
        </div>
    );
};

