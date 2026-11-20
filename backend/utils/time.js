// All attendance rules run on college time (IST). Never trust the client clock.
const { allowTimeSimulation } = require('../config');

const IST = 'Asia/Kolkata';

const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
});

const parts = (d) => {
    const o = {};
    for (const p of fmt.formatToParts(d)) o[p.type] = p.value;
    if (o.hour === '24') o.hour = '00';
    return o;
};

// { date: 'YYYY-MM-DD', time: 'HH:MM:SS' } in IST
const istNow = (d = new Date()) => {
    const o = parts(d);
    return { date: `${o.year}-${o.month}-${o.day}`, time: `${o.hour}:${o.minute}:${o.second}` };
};

const SIM_RE = /^\d{2}:\d{2}:\d{2}$/;

// Time used for rule checks. A simulated time is honoured only when the server
// is explicitly started with ALLOW_TIME_SIMULATION=true (testing environments).
const ruleTime = (requested) => {
    if (allowTimeSimulation && typeof requested === 'string' && SIM_RE.test(requested)) return requested;
    return istNow().time;
};

const todayIst = () => istNow().date;

const yesterdayIst = () => {
    const d = new Date(Date.now() - 24 * 3600 * 1000);
    return istNow(d).date;
};

// Add minutes to HH:MM:SS, clamped within the day.
const addMinutes = (timeStr, minutes) => {
    const [h, m, s] = timeStr.split(':').map(Number);
    const total = Math.min(24 * 60 - 1, h * 60 + m + minutes);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(Math.floor(total / 60))}:${pad(total % 60)}:${pad(s || 0)}`;
};

// Inclusive list of YYYY-MM-DD strings between two YYYY-MM-DD strings (timezone safe).
const dateRange = (from, to) => {
    const out = [];
    const start = new Date(`${String(from).slice(0, 10)}T00:00:00Z`);
    const end = new Date(`${String(to).slice(0, 10)}T00:00:00Z`);
    for (let d = start; d <= end && out.length < 400; d = new Date(d.getTime() + 86400000)) {
        out.push(d.toISOString().slice(0, 10));
    }
    return out;
};

module.exports = { istNow, ruleTime, todayIst, yesterdayIst, addMinutes, dateRange, allowTimeSimulation };
