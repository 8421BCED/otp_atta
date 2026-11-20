// Attendance rules, in one place. Everything here runs on college time (IST).
//
//   Morning   Miss the period 1 code by 09:05  ->  absent for periods 1 to 4. The lock lifts when
//             period 4 ends (start of lunch).
//   Afternoon Codes open again when period 5 starts (13:30). Miss that code by 13:35  ->  absent
//             for the rest of the day.
//   No rules apply on weekly off days, on declared holidays, or during a timed exemption event.
//   A sports pass or an approved leave (stored as 'od' attendance) is never locked.
const pool = require('../db');
const { weeklyOff } = require('../config');
const { groupOf } = require('./departments');

const MORNING_CUTOFF = '09:05:00';
const LUNCH_CUTOFF = '13:35:00';

let scheduleCache = { at: 0, value: null };

// The timetable facts the rules depend on, read from the periods table (cached for a minute).
const getSchedule = async () => {
    if (scheduleCache.value && Date.now() - scheduleCache.at < 60000) return scheduleCache.value;
    const [rows] = await pool.query('SELECT * FROM periods ORDER BY id ASC');
    const teaching = rows.filter((r) => !r.is_break);
    const byNo = (n) => teaching.find((r) => r.period_number === n);
    const p1 = byNo(1) || teaching[0];
    const p4 = byNo(4);
    const p5 = byNo(5);
    const last = teaching[teaching.length - 1];
    const value = {
        periods: rows,
        morningId: p1 ? p1.id : 1,
        afternoonId: p5 ? p5.id : 7,
        morningEnd: p4 ? p4.end_time : '12:40:00',        // morning lock lifts here
        afternoonStart: p5 ? p5.start_time : '13:30:00',  // codes open again here
        collegeStart: p1 ? p1.start_time : '09:00:00',
        collegeEnd: last ? last.end_time : '16:05:00'
    };
    scheduleCache = { at: Date.now(), value };
    return value;
};

const dayOfWeek = (date) => new Date(`${String(date).slice(0, 10)}T00:00:00Z`).getUTCDay();

// Holidays change a few times a year, but every student's screen asks about them. Cache the rows
// per worker for 30 seconds so thousands of polls cost the database almost nothing.
const holidayCache = new Map();
const HOLIDAY_TTL_MS = 30000;

const holidaysFor = async (depts, date) => {
    const key = `${date}|${depts.join(',')}`;
    const hit = holidayCache.get(key);
    if (hit && Date.now() - hit.at < HOLIDAY_TTL_MS) return hit.rows;

    const [rows] = await pool.query(
        `SELECT title, is_timed, start_time, end_time FROM holidays
         WHERE holiday_date = ? AND (scope = 'college' OR department IN (?))
         ORDER BY is_timed ASC`,
        [date, depts]
    );
    if (holidayCache.size > 500) holidayCache.clear();
    holidayCache.set(key, { at: Date.now(), rows });
    return rows;
};

// Is this date a normal teaching day for this department?
// Returns { off, type, title, exempt, until }. `off` is true for weekends and full day holidays.
// A timed event inside its window sets `exempt` (no locks) but classes still run.
const getOffDay = async (department, date, time) => {
    if (weeklyOff.includes(dayOfWeek(date))) {
        return { off: true, type: 'weekend', title: 'Weekly off', exempt: true };
    }

    const holidays = await holidaysFor([...groupOf(department), 'ALL'], date);

    for (const h of holidays) {
        if (!h.is_timed) return { off: true, type: 'holiday', title: h.title, exempt: true };
        if (h.start_time && h.end_time && time >= h.start_time && time <= h.end_time) {
            return { off: false, type: 'event', title: h.title, exempt: true, until: h.end_time };
        }
    }
    return { off: false, exempt: false };
};

// Pure function: given the facts, is the student locked right now, and why?
//   unlock = { time: 'HH:MM:SS' } when a HOD unlocked them today, else null.
const evaluateLock = ({ time, schedule, p1Attended, p5Attended, hasSportsPass, exempt, explicitLock, unlock }) => {
    if (hasSportsPass || exempt) {
        return { locked: false, session: null, reopensAt: null, morningLocked: false, afternoonLocked: false, explicit: false };
    }

    const morningActive = time > MORNING_CUTOFF && time < schedule.morningEnd;
    const afternoonActive = time > LUNCH_CUTOFF && time <= schedule.collegeEnd;

    // An unlock only covers the session it was granted in.
    const morningUnlocked = !!unlock && unlock.time < schedule.morningEnd;
    const afternoonUnlocked = !!unlock && unlock.time >= schedule.afternoonStart;

    const morningLocked = morningActive && !p1Attended && !morningUnlocked;
    const afternoonLocked = afternoonActive && !p5Attended && !afternoonUnlocked;
    const explicit = !!explicitLock;

    let session = null;
    if (afternoonLocked) session = 'afternoon';
    else if (morningLocked) session = 'morning';
    else if (explicit) session = 'day';

    return {
        locked: explicit || morningLocked || afternoonLocked,
        session,
        reopensAt: session === 'morning' ? schedule.afternoonStart : null,
        morningLocked,
        afternoonLocked,
        explicit
    };
};

// Turns a student_day_locks row into the facts evaluateLock needs.
const readDayLock = (row, date) => {
    if (!row) return { explicitLock: false, unlock: null };
    const explicitLock = !!row.is_locked_out;
    let unlock = null;
    if (row.reason === 'HOD_UNLOCKED') {
        // first_otp_at is when the unlock happened. An unlock recorded on another day
        // (an approved leave for a future date) counts from the start of the day.
        unlock = { time: row.unlock_date === date && row.unlock_time ? row.unlock_time : '00:00:00' };
    }
    return { explicitLock, unlock };
};

const DAY_LOCK_SQL = `SELECT is_locked_out, reason,
        DATE_FORMAT(first_otp_at, '%Y-%m-%d') AS unlock_date,
        DATE_FORMAT(first_otp_at, '%H:%i:%s') AS unlock_time
    FROM student_day_locks WHERE student_id = ? AND date = ?`;

// Everything about one student's day, for the student screen and for submitting a code.
const getStudentDayState = async ({ studentId, department, date, time }) => {
    const schedule = await getSchedule();
    const [off, [dayLockRows], [records], [pass]] = await Promise.all([
        getOffDay(department, date, time),
        pool.query(DAY_LOCK_SQL, [studentId, date]),
        pool.query(
            `SELECT period_id, status FROM attendance_records
             WHERE student_id = ? AND date = ? AND period_id IN (?, ?) AND status IN ('present', 'od')`,
            [studentId, date, schedule.morningId, schedule.afternoonId]
        ),
        pool.query(
            `SELECT sop.id, sop.event_name, sop.sport_category, sop.venue, u.name AS issued_by
             FROM sports_od_students sos
             JOIN sports_od_passes sop ON sos.pass_id = sop.id
             JOIN users u ON sop.created_by = u.id
             WHERE sos.student_id = ? AND ? BETWEEN sop.from_date AND sop.to_date AND sop.status IN ('active', 'approved')
             ORDER BY sop.id DESC LIMIT 1`,
            [studentId, date]
        )
    ]);

    const { explicitLock, unlock } = readDayLock(dayLockRows[0], date);
    const lock = evaluateLock({
        time,
        schedule,
        p1Attended: records.some((r) => r.period_id === schedule.morningId),
        p5Attended: records.some((r) => r.period_id === schedule.afternoonId),
        hasSportsPass: pass.length > 0,
        exempt: !!off.exempt,
        explicitLock: off.off ? false : explicitLock,
        unlock
    });

    return { schedule, off, lock, unlock, sportsPass: pass[0] || null };
};

module.exports = {
    clearHolidayCache: () => holidayCache.clear(),
    MORNING_CUTOFF, LUNCH_CUTOFF, getSchedule, getOffDay, evaluateLock, readDayLock, DAY_LOCK_SQL, getStudentDayState, dayOfWeek
};

