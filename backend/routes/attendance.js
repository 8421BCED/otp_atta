const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { isDeviceLockExempt } = require('../deviceLockExempt');
const { ruleTime, todayIst, yesterdayIst, addMinutes, allowTimeSimulation } = require('../utils/time');
const { sameGroup } = require('../utils/departments');
const { getSchedule, getOffDay, getStudentDayState, MORNING_CUTOFF, LUNCH_CUTOFF } = require('../utils/rules');
const { notifyAttendanceOpened } = require('../utils/push');

const router = express.Router();

const STAFF_ROLES = ['staff', 'hod', 'principal'];
const LUNCH_START = '13:30:00';
const OTP_TTL_SECONDS = 10;
const OTP_GRACE_SECONDS = 4; // a student who was typing when the code rolled over still gets in

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getPeriodForTime = (periods, timeStr) => {
    // A period starts exactly at its start time and ends exactly at its end time, the same rule the phone uses.
    for (const p of periods) {
        if (timeStr >= p.start_time && timeStr < p.end_time) return p;
    }
    if (periods.length > 0 && timeStr < periods[0].start_time) return { isBeforeCollege: true, nextPeriod: periods[0] };
    if (periods.length > 0 && timeStr >= periods[periods.length - 1].end_time) {
        return { isAfterCollege: true, lastPeriod: periods[periods.length - 1] };
    }
    return null;
};

// Staff and HODs look after students of their own department (and any department that shares
// their HOD, like AI-DS and AI-ML). The Principal sees everyone.
const canViewStudent = (viewer, student) =>
    viewer.role === 'principal' || (STAFF_ROLES.includes(viewer.role) && sameGroup(viewer.department, student.department));

// Failed and successful submissions both count: 10 tries per minute per student.
const otpAttemptLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `student:${req.user.id}`,
    validate: { keyGeneratorIpFallback: false },
    message: { error: 'Too many attempts', message: 'Too many code attempts. Wait a minute and try again.' }
});

const offDayMessage = (off) =>
    off.type === 'weekend' ? 'There are no classes today (weekly off).' : `There are no classes today: ${off.title}.`;

// ---------------------------------------------------------------------------
// 1. Current period, plus what kind of day it is for this user. One cheap request
//    replaces the separate period and holiday polls.
// ---------------------------------------------------------------------------
router.get('/current-period', authenticate, async (req, res) => {
    try {
        const schedule = await getSchedule();
        const periods = schedule.periods;
        const date = todayIst();
        const currentTimeStr = ruleTime(req.query.simulateTime);
        const activePeriod = getPeriodForTime(periods, currentTimeStr);
        const off = await getOffDay(req.user.department, date, currentTimeStr);

        return res.json({
            currentTime: currentTimeStr,
            serverTime: new Date().toISOString(),
            date,
            simulationEnabled: allowTimeSimulation,
            activePeriod: activePeriod && !activePeriod.isBeforeCollege && !activePeriod.isAfterCollege ? activePeriod : null,
            isBreak: activePeriod ? !!activePeriod.is_break : false,
            isBeforeCollege: !!(activePeriod && activePeriod.isBeforeCollege),
            isAfterCollege: !!(activePeriod && activePeriod.isAfterCollege),
            isMorningWindow: currentTimeStr >= '09:00:00' && currentTimeStr <= MORNING_CUTOFF,
            isPastMorningCutoff: currentTimeStr > MORNING_CUTOFF,
            isLunchWindow: currentTimeStr >= LUNCH_START && currentTimeStr <= LUNCH_CUTOFF,
            isPastLunchCutoff: currentTimeStr > LUNCH_CUTOFF,
            dayStatus: { off: !!off.off, type: off.type || null, title: off.title || null, exempt: !!off.exempt, until: off.until || null },
            allPeriods: periods
        });
    } catch (err) {
        console.error('Error getting current period:', err);
        return res.status(500).json({ error: 'Failed to get current period' });
    }
});

// ---------------------------------------------------------------------------
// 2. Staff: generate the rolling room OTP (only inside the first 5 minutes of a period)
// ---------------------------------------------------------------------------
router.post('/generate-otp', authenticate, authorizeRoles('staff', 'hod'), async (req, res) => {
    try {
        const roomId = parseInt(req.body.roomId, 10);
        const periodId = parseInt(req.body.periodId, 10);
        const staffId = req.user.id;

        if (!roomId || !periodId) {
            return res.status(400).json({ error: 'Room ID and Period ID are required' });
        }

        const [periodRows] = await pool.query('SELECT * FROM periods WHERE id = ?', [periodId]);
        if (periodRows.length === 0) return res.status(404).json({ error: 'Period not found' });
        const period = periodRows[0];
        if (period.is_break) return res.status(400).json({ error: 'No attendance is taken during a break.' });

        const [roomRows] = await pool.query('SELECT id, room_number FROM rooms WHERE id = ?', [roomId]);
        if (roomRows.length === 0) return res.status(404).json({ error: 'Room not found' });

        const now = ruleTime(req.body.simulateTime);
        const today = todayIst();

        const off = await getOffDay(req.user.department, today, now);
        if (off.off) return res.status(409).json({ error: offDayMessage(off), code: 'NO_CLASSES', dayOff: true });

        const cutoff = addMinutes(period.start_time, 5);
        if (now < period.start_time || now > cutoff) {
            return res.status(403).json({
                error: `OTP generation is open only for the first 5 minutes of ${period.name} (${period.start_time.slice(0, 5)} to ${cutoff.slice(0, 5)}).`,
                windowExpired: now > cutoff,
                periodName: period.name,
                startTime: period.start_time,
                cutoffTime: cutoff
            });
        }

        const otpCode = String(crypto.randomInt(0, 1000000)).padStart(6, '0');

        // Is this the first code for this room and period today? Then ring the doorbell.
        const [[already]] = await pool.query(
            'SELECT COUNT(*) AS n FROM active_otps WHERE room_id = ? AND period_id = ? AND generated_at >= CURDATE()',
            [roomId, periodId]
        );

        // Keep the previous code briefly (grace window) and clear anything stale.
        await pool.query('DELETE FROM active_otps WHERE room_id = ? AND expires_at < DATE_SUB(NOW(), INTERVAL 1 MINUTE)', [roomId]);
        await pool.query(
            `INSERT INTO active_otps (room_id, staff_id, period_id, otp_code, expires_at)
             VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
            [roomId, staffId, periodId, otpCode, OTP_TTL_SECONDS]
        );

        if (already.n === 0) {
            notifyAttendanceOpened({ department: req.user.department, periodId, periodName: period.name, roomNumber: roomRows[0].room_number, date: today })
                .catch((e) => console.error('Doorbell failed:', e.message));
        }

        // Log presence once per room and period, not on every 10 second refresh.
        const [last] = await pool.query(
            'SELECT to_room_id, period_id FROM staff_movements WHERE staff_id = ? AND date = ? ORDER BY id DESC LIMIT 1',
            [staffId, today]
        );
        if (last.length === 0 || last[0].to_room_id !== roomId || last[0].period_id !== periodId) {
            await pool.query(
                `INSERT INTO staff_movements (staff_id, to_room_id, period_id, date, note)
                 VALUES (?, ?, ?, ?, 'Classroom session active')`,
                [staffId, roomId, periodId, today]
            ).catch((e) => console.error('Staff movement log:', e.message));
        }

        return res.json({
            success: true,
            otpCode,
            roomId,
            periodId,
            expiresInSeconds: OTP_TTL_SECONDS,
            expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString(),
            message: `OTP generated. Valid for ${OTP_TTL_SECONDS} seconds.`
        });
    } catch (err) {
        console.error('Error generating OTP:', err);
        return res.status(500).json({ error: 'Failed to generate OTP' });
    }
});

// ---------------------------------------------------------------------------
// 3. Staff: the OTP this staff member is currently broadcasting in a room
// ---------------------------------------------------------------------------
router.get('/active-otp/:roomId', authenticate, authorizeRoles('staff', 'hod'), async (req, res) => {
    try {
        const [otps] = await pool.query(
            `SELECT otp_code, period_id, expires_at, GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), expires_at)) AS remaining
             FROM active_otps
             WHERE room_id = ? AND staff_id = ? AND expires_at > NOW()
             ORDER BY id DESC LIMIT 1`,
            [req.params.roomId, req.user.id]
        );
        if (otps.length === 0) return res.json({ hasActiveOtp: false });

        const otp = otps[0];
        return res.json({
            hasActiveOtp: true,
            otpCode: otp.otp_code,
            periodId: otp.period_id,
            remainingSeconds: Number(otp.remaining),
            expiresAt: otp.expires_at
        });
    } catch (err) {
        console.error('Error fetching active OTP:', err);
        return res.status(500).json({ error: 'Failed to fetch active OTP' });
    }
});

// ---------------------------------------------------------------------------
// 4. Staff/HOD/Principal: live room roster
// ---------------------------------------------------------------------------
router.get('/room-live-roster/:roomId', authenticate, authorizeRoles(...STAFF_ROLES), async (req, res) => {
    try {
        const { roomId } = req.params;
        const today = todayIst();
        const periodId = req.query.periodId;

        const [rooms] = await pool.query(
            `SELECT r.*, b.name as building_name, f.name as floor_name
             FROM rooms r JOIN buildings b ON r.building_id = b.id JOIN floors f ON r.floor_id = f.id
             WHERE r.id = ?`, [roomId]);
        if (rooms.length === 0) return res.status(404).json({ error: 'Room not found' });

        let query = `
            SELECT ar.id, ar.marked_at, ar.status, u.id as student_id, u.name, u.email, u.roll_number, u.department, u.year_of_study
            FROM attendance_records ar
            JOIN users u ON ar.student_id = u.id
            WHERE ar.room_id = ? AND ar.date = ? AND ar.status = 'present'`;
        const params = [roomId, today];
        if (periodId) { query += ' AND ar.period_id = ?'; params.push(periodId); }
        query += ' ORDER BY ar.marked_at DESC';

        const [students] = await pool.query(query, params);
        return res.json({ room: rooms[0], presentCount: students.length, students });
    } catch (err) {
        console.error('Error fetching live room roster:', err);
        return res.status(500).json({ error: 'Failed to fetch room roster' });
    }
});

// ---------------------------------------------------------------------------
// 5. Student: submit the room OTP
// ---------------------------------------------------------------------------
router.post('/submit-otp', authenticate, authorizeRoles('student'), otpAttemptLimiter, async (req, res) => {
    const studentId = req.user.id;
    try {
        const roomId = parseInt(req.body.roomId, 10);
        const otpCode = String(req.body.otpCode || '').trim();
        const today = todayIst();
        const nowTime = ruleTime(req.body.currentTime);
        const exempt = isDeviceLockExempt(req.user.email);

        if (!roomId || !/^\d{6}$/.test(otpCode)) {
            return res.status(400).json({ error: 'Choose your classroom and enter the 6-digit code.' });
        }

        // A. Device: the fingerprint inside the signed session must match the registered device.
        const deviceFp = req.user.deviceFp || null;
        const deviceId = req.user.deviceId || null;
        if (!exempt) {
            const [locks] = await pool.query('SELECT device_fingerprint, device_name, is_locked FROM device_locks WHERE user_id = ?', [studentId]);
            const lock = locks[0];
            if (!lock || !deviceFp || (lock.is_locked && lock.device_fingerprint !== deviceFp)) {
                return res.status(403).json({
                    code: 'DEVICE_MISMATCH',
                    error: 'Device not recognised',
                    message: lock
                        ? `This account is registered to "${lock.device_name}". Attendance can only be submitted from that device.`
                        : 'This device is not registered. Sign out and sign in again.'
                });
            }
        }

        // B. What kind of day is it, and is this student locked right now?
        const state = await getStudentDayState({ studentId, department: req.user.department, date: today, time: nowTime });
        if (state.off.off) {
            return res.status(409).json({ code: 'NO_CLASSES', error: 'No classes today', message: offDayMessage(state.off) });
        }
        if (state.lock.locked) {
            const morning = state.lock.session === 'morning';
            return res.status(403).json({
                code: 'DAY_LOCKED_OUT',
                session: state.lock.session,
                reopensAt: state.lock.reopensAt,
                error: morning ? 'Morning attendance locked' : 'Attendance locked',
                message: morning
                    ? `You did not enter the code between 9:00 and 9:05 AM, so you are marked absent for the morning periods. Attendance reopens at ${state.lock.reopensAt.slice(0, 5)} after lunch, or meet your HOD to unlock it sooner.`
                    : 'You did not enter the code in the first five minutes after lunch, so you are marked absent for the rest of the day. Meet your HOD in person to request an unlock.'
            });
        }

        // C. The code must belong to the room the student picked
        const [activeOtps] = await pool.query(
            `SELECT * FROM active_otps
             WHERE room_id = ? AND otp_code = ? AND expires_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)
             ORDER BY id DESC LIMIT 1`,
            [roomId, otpCode, OTP_GRACE_SECONDS]
        );

        if (activeOtps.length === 0) {
            const [other] = await pool.query(
                `SELECT r.room_number FROM active_otps a JOIN rooms r ON r.id = a.room_id
                 WHERE a.otp_code = ? AND a.room_id <> ? AND a.expires_at >= DATE_SUB(NOW(), INTERVAL ? SECOND) LIMIT 1`,
                [otpCode, roomId, OTP_GRACE_SECONDS]
            );
            if (other.length > 0) {
                return res.status(400).json({
                    code: 'CROSS_ROOM_MISMATCH',
                    error: 'Wrong classroom',
                    message: `That code belongs to room ${other[0].room_number}, not the room you selected.`
                });
            }
            return res.status(400).json({
                error: 'Invalid or expired code',
                message: 'The code is wrong or has expired. Enter the fresh code shown by your faculty.'
            });
        }

        const activeOtp = activeOtps[0];
        const periodId = activeOtp.period_id; // the period comes from the OTP, never from the client

        // D. One device, one attendance per period
        if (deviceId && !exempt) {
            const [dup] = await pool.query(
                `SELECT student_id FROM attendance_records
                 WHERE device_id = ? AND period_id = ? AND date = ? AND student_id <> ? AND status = 'present' LIMIT 1`,
                [deviceId, periodId, today, studentId]
            );
            if (dup.length > 0) {
                return res.status(409).json({
                    code: 'DEVICE_REUSED',
                    error: 'Device already used',
                    message: 'Another student has already marked attendance from this device for this period.'
                });
            }
        }

        const [targetRooms] = await pool.query('SELECT r.id, r.room_number, r.name FROM rooms r WHERE r.id = ?', [roomId]);
        const targetRoom = targetRooms[0] || { room_number: roomId, name: 'Room' };

        // Thousands of students submit at the same moment. If MySQL has to cancel one transaction because two
        // collided (a deadlock), try again a moment later instead of showing the student an error.
        const TRANSIENT = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']);
        for (let attempt = 1; attempt <= 4; attempt++) {
            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();

                // Look without locking first. Locking a row that does not exist yet takes a "gap" lock,
                // and gap locks are what made simultaneous check-ins collide.
                const [seen] = await conn.query(
                    'SELECT id FROM attendance_records WHERE student_id = ? AND period_id = ? AND date = ?',
                    [studentId, periodId, today]
                );
                let existing = [];
                if (seen.length > 0) {
                    // Lock only this one existing row (by its id) before changing it.
                    [existing] = await conn.query('SELECT * FROM attendance_records WHERE id = ? FOR UPDATE', [seen[0].id]);
                }

                if (existing.length > 0) {
                    const current = existing[0];
                    if (current.room_id === roomId) {
                        await conn.rollback();
                        return res.status(409).json({
                            error: 'Already recorded',
                            message: `You have already marked attendance in room ${targetRoom.room_number} for this period.`
                        });
                    }

                    // Moving to a lab or another room mid-period
                    const [oldRooms] = await conn.query('SELECT room_number FROM rooms WHERE id = ?', [current.room_id]);
                    const oldNumber = oldRooms[0] ? oldRooms[0].room_number : current.room_id;

                    await conn.query(
                        'UPDATE attendance_records SET room_id = ?, staff_id = ?, otp_used = ?, device_id = ?, marked_at = NOW() WHERE id = ?',
                        [roomId, activeOtp.staff_id, otpCode, deviceId, current.id]
                    );
                    await conn.query(
                        `INSERT INTO student_movements (student_id, from_room_id, to_room_id, period_id, date, duration_minutes, note)
                         VALUES (?, ?, ?, ?, ?, 0, ?)`,
                        [studentId, current.room_id, roomId, periodId, today,
                            `Moved from room ${oldNumber} to room ${targetRoom.room_number} (${targetRoom.name}), verified by faculty code`]
                    );
                    await conn.commit();
                    return res.json({
                        success: true,
                        isRelocation: true,
                        message: `Arrival verified. You are now checked into room ${targetRoom.room_number} (${targetRoom.name}).`,
                        periodId,
                        roomId
                    });
                }

                // The unique key (student, period, date) is the real guard against a double submit.
                await conn.query(
                    `INSERT INTO attendance_records (student_id, period_id, room_id, staff_id, date, status, otp_used, device_id)
                     VALUES (?, ?, ?, ?, ?, 'present', ?, ?)`,
                    [studentId, periodId, roomId, activeOtp.staff_id, today, otpCode, deviceId]
                );

                const [lastMove] = await conn.query(
                    'SELECT to_room_id FROM student_movements WHERE student_id = ? AND date = ? ORDER BY id DESC LIMIT 1',
                    [studentId, today]
                );
                await conn.query(
                    `INSERT INTO student_movements (student_id, from_room_id, to_room_id, period_id, date, duration_minutes, note)
                     VALUES (?, ?, ?, ?, ?, 0, ?)`,
                    [studentId, lastMove.length > 0 ? lastMove[0].to_room_id : null, roomId, periodId, today,
                        `Checked in to room ${targetRoom.room_number} with the rolling code`]
                );

                // Marking period 1 is what opens the day. Keep any HOD unlock time intact.
                if (periodId === state.schedule.morningId) {
                    await conn.query(
                        `INSERT INTO student_day_locks (student_id, date, first_otp_at, is_locked_out)
                         VALUES (?, ?, NOW(), 0)
                         ON DUPLICATE KEY UPDATE first_otp_at = IF(reason = 'HOD_UNLOCKED', first_otp_at, NOW()), is_locked_out = 0`,
                        [studentId, today]
                    );
                }

                await conn.commit();
                return res.json({
                    success: true,
                    message: `Attendance verified. Marked present in room ${targetRoom.room_number}.`,
                    periodId,
                    roomId
                });
            } catch (txErr) {
                try { await conn.rollback(); } catch (e) { /* ignore */ }
                if (txErr && txErr.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Already recorded', message: 'Your attendance for this period was already recorded.' });
                }
                if (txErr && TRANSIENT.has(txErr.code) && attempt < 4) {
                    await new Promise((r) => setTimeout(r, 15 + Math.random() * 60 * attempt));
                    continue;
                }
                throw txErr;
            } finally {
                conn.release();
            }
        }    } catch (err) {
        console.error('Error submitting OTP:', err);
        return res.status(500).json({ error: 'Failed to record attendance' });
    }
});

// ---------------------------------------------------------------------------
// 6. Student daily timeline. Also carries the lock state, the kind of day and any sports pass,
//    so the student screen needs only this one request (plus the period one) to stay current.
// ---------------------------------------------------------------------------
router.get('/student-timeline/:studentId', authenticate, async (req, res) => {
    try {
        const studentId = Number(req.params.studentId);
        const isSelf = req.user.role === 'student' && req.user.id === studentId;

        let department = req.user.department;
        if (!isSelf) {
            const [rows] = await pool.query('SELECT department FROM users WHERE id = ? AND role = "student"', [studentId]);
            if (rows.length === 0) return res.status(404).json({ error: 'Student not found' });
            if (!canViewStudent(req.user, rows[0])) return res.status(403).json({ error: 'Access denied' });
            department = rows[0].department;
        }

        const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : todayIst();
        const nowTime = ruleTime(req.query.simulateTime);

        const [attendance] = await pool.query(
            `SELECT ar.*, r.room_number, r.name as room_name, b.name as building_name
             FROM attendance_records ar
             JOIN rooms r ON ar.room_id = r.id
             JOIN buildings b ON r.building_id = b.id
             WHERE ar.student_id = ? AND ar.date = ?`, [studentId, date]);

        const state = await getStudentDayState({ studentId, department, date, time: nowTime });

        const timeline = state.schedule.periods.map((p) => {
            const att = attendance.find((a) => a.period_id === p.id);
            return { ...p, attendance: att || null, isMarked: !!att, status: att ? att.status : (p.is_break ? 'break' : 'pending') };
        });

        const ok = (a) => a.status === 'present' || a.status === 'od';
        return res.json({
            date,
            serverTime: nowTime,
            timeline,
            totalPresent: attendance.filter(ok).length,
            isDayLocked: state.lock.locked,
            lockSession: state.lock.session,      // 'morning' | 'afternoon' | 'day' | null
            lockReopensAt: state.lock.reopensAt,  // set for the morning lock
            isHodUnlocked: !!state.unlock,
            dayOff: state.off.off ? { type: state.off.type, title: state.off.title } : null,
            exemptEvent: state.off.exempt && !state.off.off ? { title: state.off.title, until: state.off.until } : null,
            activeSportsPass: state.sportsPass,
            // kept for older screens
            isPastCutoff: nowTime > MORNING_CUTOFF,
            isPastMorningCutoff: nowTime > MORNING_CUTOFF,
            isPastLunchCutoff: nowTime > LUNCH_CUTOFF,
            isPeriod1Present: attendance.some((a) => a.period_id === state.schedule.morningId && ok(a))
        });
    } catch (err) {
        console.error('Error fetching student timeline:', err);
        return res.status(500).json({ error: 'Failed to fetch timeline' });
    }
});

// ---------------------------------------------------------------------------
// 7. Full student profile and history (the student themself, or staff of that department)
// ---------------------------------------------------------------------------
router.get('/student-details/:studentId', authenticate, async (req, res) => {
    try {
        const studentId = Number(req.params.studentId);
        const [users] = await pool.query(
            'SELECT id, name, email, roll_number, department, year_of_study FROM users WHERE id = ? AND role = "student"',
            [studentId]
        );
        if (users.length === 0) return res.status(404).json({ error: 'Student not found' });
        const student = users[0];

        const isSelf = req.user.role === 'student' && req.user.id === studentId;
        if (!isSelf && !canViewStudent(req.user, student)) return res.status(403).json({ error: 'Access denied' });

        const [locks] = await pool.query(
            'SELECT device_name, platform, screen_resolution, is_locked, locked_at, last_verified_at FROM device_locks WHERE user_id = ?',
            [studentId]);
        const deviceLock = locks.length > 0 ? locks[0] : null;

        const today = todayIst();
        const yesterday = yesterdayIst();

        const [latestMove] = await pool.query(
            `SELECT sm.*, r.room_number, r.name as room_name, b.name as building_name, f.name as floor_name
             FROM student_movements sm
             JOIN rooms r ON sm.to_room_id = r.id
             JOIN buildings b ON r.building_id = b.id
             JOIN floors f ON r.floor_id = f.id
             WHERE sm.student_id = ? ORDER BY sm.timestamp DESC LIMIT 1`, [studentId]);

        const dayQuery = `
            SELECT ar.*, p.name as period_name, p.start_time, p.end_time, r.room_number, r.name as room_name, b.name as building_name
            FROM attendance_records ar
            JOIN periods p ON ar.period_id = p.id
            LEFT JOIN rooms r ON ar.room_id = r.id
            LEFT JOIN buildings b ON r.building_id = b.id
            WHERE ar.student_id = ? AND ar.date = ?
            ORDER BY p.id ASC`;
        const [todayRecords] = await pool.query(dayQuery, [studentId, today]);
        const [yesterdayRecords] = await pool.query(dayQuery, [studentId, yesterday]);

        const [stats] = await pool.query(
            `SELECT COUNT(*) as total_periods,
                    SUM(CASE WHEN status IN ('present', 'od') THEN 1 ELSE 0 END) as present_periods
             FROM attendance_records WHERE student_id = ?`, [studentId]);

        const [pastDates] = await pool.query(
            `SELECT ar.date, COUNT(DISTINCT ar.period_id) as periods_marked,
                    MAX(r.room_number) as last_room, MAX(b.name) as last_building
             FROM attendance_records ar
             LEFT JOIN rooms r ON ar.room_id = r.id
             LEFT JOIN buildings b ON r.building_id = b.id
             WHERE ar.student_id = ? AND ar.status IN ('present', 'od')
             GROUP BY ar.date ORDER BY ar.date DESC LIMIT 14`, [studentId]);

        const [allRecords] = await pool.query(
            `SELECT ar.id, DATE_FORMAT(ar.date, '%Y-%m-%d') as date_str, ar.period_id, ar.status, ar.marked_at,
                    p.name as period_name, p.start_time, p.end_time,
                    r.room_number, r.name as room_name, b.name as building_name
             FROM attendance_records ar
             JOIN periods p ON ar.period_id = p.id
             LEFT JOIN rooms r ON ar.room_id = r.id
             LEFT JOIN buildings b ON r.building_id = b.id
             WHERE ar.student_id = ?
             ORDER BY ar.date DESC, p.id ASC`, [studentId]);

        const [movements] = await pool.query(
            `SELECT sm.id, DATE_FORMAT(sm.date, '%Y-%m-%d') as date_str, sm.timestamp, sm.note,
                    r_to.room_number as to_room, r_to.name as to_room_name, b_to.name as to_building,
                    r_from.room_number as from_room, r_from.name as from_room_name, b_from.name as from_building
             FROM student_movements sm
             JOIN rooms r_to ON sm.to_room_id = r_to.id
             JOIN buildings b_to ON r_to.building_id = b_to.id
             LEFT JOIN rooms r_from ON sm.from_room_id = r_from.id
             LEFT JOIN buildings b_from ON r_from.building_id = b_from.id
             WHERE sm.student_id = ?
             ORDER BY sm.timestamp DESC LIMIT 500`, [studentId]);

        const [holidays] = await pool.query(
            `SELECT title, DATE_FORMAT(holiday_date, '%Y-%m-%d') as date_str, reason, scope, is_timed, start_time, end_time
             FROM holidays WHERE scope = 'college' OR department IN (?, 'ALL')`, [student.department]);

        const [sportsPasses] = await pool.query(
            `SELECT sop.event_name, DATE_FORMAT(sop.from_date, '%Y-%m-%d') as from_date_str, DATE_FORMAT(sop.to_date, '%Y-%m-%d') as to_date_str, sop.status
             FROM sports_od_students sos JOIN sports_od_passes sop ON sos.pass_id = sop.id
             WHERE sos.student_id = ? AND sop.status IN ('active', 'approved')`, [studentId]);

        return res.json({
            student,
            currentLocation: latestMove.length > 0 ? latestMove[0] : null,
            deviceLock,
            todayRecords,
            yesterdayRecords,
            allRecords,
            movements,
            holidays,
            sportsPasses,
            weeklyOff: require('../config').weeklyOff,
            stats: {
                totalPeriods: stats[0].total_periods || 0,
                presentPeriods: stats[0].present_periods || 0,
                percentage: stats[0].total_periods > 0
                    ? Math.round((stats[0].present_periods / stats[0].total_periods) * 100)
                    : 100
            },
            pastDates
        });
    } catch (err) {
        console.error('Error fetching student details:', err);
        return res.status(500).json({ error: 'Failed to fetch student details' });
    }
});

module.exports = router;

