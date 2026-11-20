const express = require('express');
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { todayIst, ruleTime } = require('../utils/time');
const { groupOf, sameGroup } = require('../utils/departments');
const { getSchedule, getOffDay, evaluateLock, readDayLock } = require('../utils/rules');

const router = express.Router();

router.use(authenticate);

// The departments a request is about. HODs and staff see their own department plus any that share
// their HOD (AI-DS and AI-ML). The Principal may choose a department.
const scopeDepartments = (req) => {
    const dept = req.user.role === 'principal' ? (req.query.department || req.body?.department || 'IT') : req.user.department;
    return groupOf(dept);
};

// HODs may act only on students of their own department group. The Principal may act on anyone.
const studentInScope = async (user, studentId) => {
    const [rows] = await pool.query('SELECT id, name, department FROM users WHERE id = ? AND role = "student"', [studentId]);
    if (rows.length === 0) return { error: 'Student not found', status: 404 };
    if (user.role !== 'principal' && !sameGroup(user.department, rows[0].department)) {
        return { error: 'This student belongs to another department', status: 403 };
    }
    return { student: rows[0] };
};

// 1. Department live overview
router.get('/overview', authorizeRoles('hod', 'staff', 'principal'), async (req, res) => {
    try {
        const departments = scopeDepartments(req);
        const today = todayIst();

        const [totalStudents] = await pool.query('SELECT COUNT(*) as total FROM users WHERE role = "student" AND department IN (?)', [departments]);
        const [presentToday] = await pool.query(
            `SELECT COUNT(DISTINCT ar.student_id) as present
             FROM attendance_records ar JOIN users u ON ar.student_id = u.id
             WHERE u.department IN (?) AND ar.date = ? AND ar.status IN ('present', 'od')`, [departments, today]);
        const [roomDistribution] = await pool.query(
            `SELECT r.id as room_id, r.room_number, r.name as room_name, b.name as building_name,
                    COUNT(DISTINCT ar.student_id) as student_count
             FROM attendance_records ar
             JOIN users u ON ar.student_id = u.id
             JOIN rooms r ON ar.room_id = r.id
             JOIN buildings b ON r.building_id = b.id
             WHERE u.department IN (?) AND ar.date = ? AND ar.status = 'present'
             GROUP BY r.id, r.room_number, r.name, b.name
             ORDER BY student_count DESC`, [departments, today]);

        const total = totalStudents[0].total;
        return res.json({
            department: departments.join(' and '),
            totalStudents: total,
            presentToday: presentToday[0].present,
            attendanceRate: total > 0 ? Math.round((presentToday[0].present / total) * 100) : 0,
            roomDistribution
        });
    } catch (err) {
        console.error('Error fetching HOD overview:', err);
        return res.status(500).json({ error: 'Failed to fetch department overview' });
    }
});

// 2. Students in the department
router.get('/students', authorizeRoles('hod', 'staff', 'principal'), async (req, res) => {
    try {
        const departments = scopeDepartments(req);
        const search = req.query.q ? `%${String(req.query.q).trim()}%` : '%';
        const today = todayIst();

        const [students] = await pool.query(
            `SELECT u.id, u.name, u.email, u.roll_number, u.department, u.year_of_study,
                    dl.device_name, dl.is_locked, dl.locked_at,
                    (SELECT r.room_number FROM student_movements sm JOIN rooms r ON sm.to_room_id = r.id
                     WHERE sm.student_id = u.id AND sm.date = ? ORDER BY sm.timestamp DESC LIMIT 1) as current_room,
                    (SELECT b.name FROM student_movements sm JOIN rooms r ON sm.to_room_id = r.id JOIN buildings b ON r.building_id = b.id
                     WHERE sm.student_id = u.id AND sm.date = ? ORDER BY sm.timestamp DESC LIMIT 1) as current_building,
                    (SELECT COUNT(*) FROM attendance_records ar WHERE ar.student_id = u.id AND ar.date = ? AND ar.status IN ('present', 'od')) as periods_attended
             FROM users u
             LEFT JOIN device_locks dl ON u.id = dl.user_id
             WHERE u.role = "student" AND u.department IN (?) AND (u.name LIKE ? OR u.email LIKE ? OR u.roll_number LIKE ?)
             ORDER BY u.name ASC`,
            [today, today, today, departments, search, search, search]
        );
        return res.json({ students });
    } catch (err) {
        console.error('Error searching students:', err);
        return res.status(500).json({ error: 'Failed to search students' });
    }
});

// 3. Reset a student's device binding
router.post('/reset-device-lock', authorizeRoles('hod', 'principal'), async (req, res) => {
    try {
        const { studentId } = req.body || {};
        if (!studentId) return res.status(400).json({ error: 'Student ID is required' });

        const scope = await studentInScope(req.user, studentId);
        if (scope.error) return res.status(scope.status).json({ error: scope.error });

        await pool.query('DELETE FROM device_locks WHERE user_id = ?', [studentId]);
        console.log(`AUDIT device reset: student ${studentId} by ${req.user.role} ${req.user.id}`);

        return res.json({
            success: true,
            message: `Device binding reset for ${scope.student.name}. The next device they sign in from will be registered.`
        });
    } catch (err) {
        console.error('Error resetting device lock:', err);
        return res.status(500).json({ error: 'Failed to reset device lock' });
    }
});

// 4. Students who are locked right now (see utils/rules.js for the morning and afternoon rules)
router.get('/locked-students', authorizeRoles('hod', 'principal'), async (req, res) => {
    try {
        const departments = scopeDepartments(req);
        const today = todayIst();
        const now = ruleTime(req.query.simulateTime);
        const schedule = await getSchedule();

        const [students] = await pool.query(
            `SELECT u.id, u.name, u.email, u.roll_number, u.department, u.year_of_study,
                    sdl.is_locked_out, sdl.reason,
                    DATE_FORMAT(sdl.first_otp_at, '%Y-%m-%d') AS unlock_date,
                    DATE_FORMAT(sdl.first_otp_at, '%H:%i:%s') AS unlock_time,
                    (SELECT COUNT(*) FROM attendance_records ar WHERE ar.student_id = u.id AND ar.date = ? AND ar.period_id = ? AND ar.status IN ('present', 'od')) as p1_attended,
                    (SELECT COUNT(*) FROM attendance_records ar WHERE ar.student_id = u.id AND ar.date = ? AND ar.period_id = ? AND ar.status IN ('present', 'od')) as p5_attended,
                    (SELECT COUNT(*) FROM sports_od_students sos JOIN sports_od_passes sop ON sos.pass_id = sop.id
                     WHERE sos.student_id = u.id AND ? BETWEEN sop.from_date AND sop.to_date AND sop.status IN ('active', 'approved')) as has_sports_od
             FROM users u
             LEFT JOIN student_day_locks sdl ON u.id = sdl.student_id AND sdl.date = ?
             WHERE u.role = "student" AND u.department IN (?)
             ORDER BY u.name ASC`,
            [today, schedule.morningId, today, schedule.afternoonId, today, today, departments]
        );

        const offCache = new Map();
        const offFor = async (dept) => {
            if (!offCache.has(dept)) offCache.set(dept, await getOffDay(dept, today, now));
            return offCache.get(dept);
        };

        const lockedList = [];
        for (const st of students) {
            const off = await offFor(st.department);
            if (off.off) continue; // nobody is locked on a holiday or weekly off

            const { explicitLock, unlock } = readDayLock(st, today);
            const lock = evaluateLock({
                time: now, schedule,
                p1Attended: st.p1_attended > 0, p5Attended: st.p5_attended > 0,
                hasSportsPass: st.has_sports_od > 0, exempt: off.exempt,
                explicitLock, unlock
            });
            const unlockedToday = st.reason === 'HOD_UNLOCKED' && (st.unlock_date === today);
            if (!lock.locked && !unlockedToday) continue;

            let lockType = 'Unlocked by HOD';
            if (lock.session === 'morning') lockType = 'Morning, periods 1 to 4';
            else if (lock.session === 'afternoon') lockType = 'Afternoon, rest of the day';
            else if (lock.session === 'day') lockType = 'Locked by HOD';

            lockedList.push({
                id: st.id,
                name: st.name,
                email: st.email,
                roll_number: st.roll_number,
                year_of_study: st.year_of_study,
                lockType,
                session: lock.session,
                isHodUnlocked: !lock.locked,
                unlockedAt: unlockedToday ? st.unlock_time : null,
                status: lock.locked ? 'locked' : 'unlocked'
            });
        }

        return res.json({ success: true, lockedStudents: lockedList, count: lockedList.filter((l) => l.status === 'locked').length });
    } catch (err) {
        console.error('Error fetching locked students for HOD:', err);
        return res.status(500).json({ error: 'Failed to fetch locked students' });
    }
});

// 5. Unlock a student's attendance. The unlock covers the session it is granted in
//    (morning until lunch, or afternoon until the end of the day).
router.post('/unlock-student-day', authorizeRoles('hod', 'principal'), async (req, res) => {
    try {
        const { studentId } = req.body || {};
        if (!studentId) return res.status(400).json({ error: 'Student ID is required' });

        const scope = await studentInScope(req.user, studentId);
        if (scope.error) return res.status(scope.status).json({ error: scope.error });

        await pool.query(
            `INSERT INTO student_day_locks (student_id, date, first_otp_at, is_locked_out, reason)
             VALUES (?, ?, NOW(), 0, 'HOD_UNLOCKED')
             ON DUPLICATE KEY UPDATE is_locked_out = 0, reason = 'HOD_UNLOCKED', first_otp_at = NOW()`,
            [studentId, todayIst()]
        );
        console.log(`AUDIT unlock: student ${studentId} by ${req.user.role} ${req.user.id}`);

        return res.json({
            success: true,
            message: `Attendance unlocked for ${scope.student.name}. They can enter codes for the rest of this session.`
        });
    } catch (err) {
        console.error('Error unlocking student day:', err);
        return res.status(500).json({ error: 'Failed to unlock student day' });
    }
});

// 6. Lock a student's attendance for the rest of today
router.post('/relock-student-day', authorizeRoles('hod', 'principal'), async (req, res) => {
    try {
        const { studentId } = req.body || {};
        if (!studentId) return res.status(400).json({ error: 'Student ID is required' });

        const scope = await studentInScope(req.user, studentId);
        if (scope.error) return res.status(scope.status).json({ error: scope.error });

        await pool.query(
            `INSERT INTO student_day_locks (student_id, date, is_locked_out, reason)
             VALUES (?, ?, 1, 'LOCKED_BY_HOD')
             ON DUPLICATE KEY UPDATE is_locked_out = 1, reason = 'LOCKED_BY_HOD'`,
            [studentId, todayIst()]
        );
        console.log(`AUDIT relock: student ${studentId} by ${req.user.role} ${req.user.id}`);

        return res.json({ success: true, message: 'Attendance locked for this student for the rest of today.' });
    } catch (err) {
        console.error('Error re-locking student day:', err);
        return res.status(500).json({ error: 'Failed to re-lock student day' });
    }
});

module.exports = router;
