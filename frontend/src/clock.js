// College time (IST), taken from the SERVER and ticked locally.
//
//  * The phone's own clock is never trusted. We measure how far it is from the server and correct for it,
//    so a wrong clock cannot show the wrong period.
//  * Ticking is a local timer. A slow or dead network cannot stop it: the clock just keeps running on the
//    last known offset and quietly corrects itself the next time a sync gets through.
//  * The current period is worked out here from the timetable, so it changes at exactly 09:50:00
//    instead of waiting for the next request.
import { useSyncExternalStore } from 'react';

const IST_PARTS = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
});
const IST_12H = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
});

let offset = 0;          // milliseconds to add to the phone's clock to get the server's clock
let synced = false;
let samples = [];        // recent sync measurements, the fastest round trip is the most accurate
let tickCount = 0;
let timer = null;
const subscribers = new Set();

export const nowMs = () => Date.now() + offset;
export const isClockSynced = () => synced;

export const istParts = (ms = nowMs()) => {
    const o = {};
    for (const p of IST_PARTS.formatToParts(new Date(ms))) o[p.type] = p.value;
    if (o.hour === '24') o.hour = '00';
    return { date: `${o.year}-${o.month}-${o.day}`, time: `${o.hour}:${o.minute}:${o.second}` };
};

// "10:42" "07" "AM" for the clock chip
export const clockDisplay = (ms = nowMs()) => {
    const m = IST_12H.format(new Date(ms)).match(/^(\d{1,2}:\d{2}):(\d{2})\s*(am|pm)?$/i);
    return m ? { hm: m[1], sec: `:${m[2]}`, ampm: (m[3] || '').toUpperCase() } : { hm: IST_12H.format(new Date(ms)), sec: '', ampm: '' };
};

const notify = () => subscribers.forEach((fn) => fn());

// One timer for the whole app, aligned to the start of each second.
const schedule = () => {
    timer = setTimeout(() => {
        tickCount += 1;
        notify();
        schedule();
    }, 1000 - (nowMs() % 1000) + 4);
};

const subscribe = (fn) => {
    subscribers.add(fn);
    if (!timer) schedule();
    return () => subscribers.delete(fn);
};

// Ask the server what time it is. Cheap: no login, no database.
export const syncClock = async () => {
    try {
        const t0 = performance.now();
        const res = await fetch('/api/time', { cache: 'no-store' });
        if (!res.ok) return;
        const { now } = await res.json();
        const rtt = performance.now() - t0;
        samples.push({ rtt, offset: now + rtt / 2 - Date.now() });
        if (samples.length > 6) samples.shift();
        offset = samples.reduce((best, s) => (s.rtt < best.rtt ? s : best)).offset;
        synced = true;
        notify();
    } catch (e) { /* offline: keep running on the last offset */ }
};

export const startClock = () => {
    if (typeof window === 'undefined' || window.__clockStarted) return;
    window.__clockStarted = true;
    syncClock();
    setInterval(syncClock, 45000);
    const again = () => { if (!document.hidden) { syncClock(); tickCount += 1; notify(); } };
    document.addEventListener('visibilitychange', again);
    window.addEventListener('online', syncClock);
    window.addEventListener('focus', again);
    window.addEventListener('pageshow', again);
    if (!timer) schedule();
};

// Re-renders every second. Use inside the few components that show seconds.
export const useClock = () => {
    useSyncExternalStore(subscribe, () => tickCount);
    return istParts(nowMs());
};

// Subscribe to something derived from the clock and re-render ONLY when it changes.
// `select` must return a primitive (a string or number).
export const useClockSelector = (select) => useSyncExternalStore(subscribe, () => select(nowMs()));

// Which period it is, from the timetable and a time of day. A period starts exactly at its start time
// and ends exactly at its end time, so the change happens on the second.
export const derivePeriodInfo = (periods, time) => {
    if (!periods || periods.length === 0) return null;
    const active = periods.find((p) => time >= p.start_time && time < p.end_time) || null;
    const last = periods[periods.length - 1];
    return {
        currentTime: time,
        activePeriod: active,
        isBreak: !!(active && active.is_break),
        isBeforeCollege: !active && time < periods[0].start_time,
        isAfterCollege: !active && time >= last.end_time,
        isMorningWindow: time >= '09:00:00' && time <= '09:05:00',
        isPastMorningCutoff: time > '09:05:00',
        isLunchWindow: time >= '13:30:00' && time <= '13:35:00',
        isPastLunchCutoff: time > '13:35:00'
    };
};

export const toSeconds = (t) => {
    const [h, m, s] = String(t || '0:0:0').split(':').map(Number);
    return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
};
