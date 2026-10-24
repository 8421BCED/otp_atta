const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// 1. Department Live Overview (Students present, room distribution)
router.get('/overview', authenticate, authorizeRoles('hod', 'staff', 'principal'), async (req, res) => {
    try {
        const department = req.user.role === 'principal' ? (req.query.department || 'IT') : req.user.department;
        const today = new Date().toISOString().slice(0, 10);

        // Department total student count
        const [totalStudents] = await pool.query(
            'SELECT COUNT(*) as total FROM users WHERE role = "student" AND department = ?',
            [department]
        );

        // Department present count today
        const [presentToday] = await pool.query(
            `SELECT COUNT(DISTINCT ar.student_id) as present 
             FROM attendance_records ar
             JOIN users u ON ar.student_id = u.id
             WHERE u.department = ? AND ar.date = ? AND ar.status = "present"`,
            [department, today]
        );

        // Real-time room distribution of department students
        const [roomDistribution] = await pool.query(
            `SELECT r.id as room_id, r.room_number, r.name as room_name, b.name as building_name,
                    COUNT(DISTINCT ar.student_id) as student_count
             FROM attendance_records ar
             JOIN users u ON ar.student_id = u.id
             JOIN rooms r ON ar.room_id = r.id
             JOIN buildings b ON r.building_id = b.id
             WHERE u.department = ? AND ar.date = ? AND ar.status = "present"
             GROUP BY r.id, r.room_number, r.name, b.name
             ORDER BY student_count DESC`,
            [department, today]
        );

        return res.json({
            department,
            totalStudents: totalStudents[0].total,
            presentToday: presentToday[0].present,
            attendanceRate: totalStudents[0].total > 0 
                ? Math.round((presentToday[0].present / totalStudents[0].total) * 100) 
                : 0,
            roomDistribution
        });
    } catch (err) {
        console.error('Error fetching HOD overview:', err);
        return res.status(500).json({ error: 'Failed to fetch department overview' });
    }
});

// 2. Search Students in Department (Real-time location & status)
router.get('/students', authenticate, authorizeRoles('hod', 'staff', 'principal'), async (req, res) => {
    try {
        const department = req.user.role === 'principal' ? (req.query.department || 'IT') : req.user.department;
        const search = req.query.q ? `%${req.query.q.trim()}%` : '%';
        const today = new Date().toISOString().slice(0, 10);

        const [students] = await pool.query(
            `SELECT u.id, u.name, u.email, u.roll_number, u.department, u.year_of_study,
                    dl.device_name, dl.is_locked, dl.locked_at,
                    (SELECT r.room_number FROM student_movements sm 
                     JOIN rooms r ON sm.to_room_id = r.id 
                     WHERE sm.student_id = u.id AND sm.date = ? 
                     ORDER BY sm.timestamp DESC LIMIT 1) as current_room,
                    (SELECT b.name FROM student_movements sm 
                     JOIN rooms r ON sm.to_room_id = r.id 
                     JOIN buildings b ON r.building_id = b.id
                     WHERE sm.student_id = u.id AND sm.date = ? 
                     ORDER BY sm.timestamp DESC LIMIT 1) as current_building,
                    (SELECT COUNT(*) FROM attendance_records ar WHERE ar.student_id = u.id AND ar.date = ? AND ar.status = "present") as periods_attended
             FROM users u
             LEFT JOIN device_locks dl ON u.id = dl.user_id
             WHERE u.role = "student" AND u.department = ? AND (u.name LIKE ? OR u.email LIKE ?)
             ORDER BY u.name ASC`,
            [today, today, today, department, search, search]
        );

        return res.json({ students });
    } catch (err) {
        console.error('Error searching students:', err);
        return res.status(500).json({ error: 'Failed to search students' });
    }
});

// 3. Reset Device Lock (Anti-Proxy Reset)
router.post('/reset-device-lock', authenticate, authorizeRoles('hod', 'principal'), async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) {
            return res.status(400).json({ error: 'Student ID is required' });
        }

        // Delete the bound device lock so the student can re-register their new phone on next login
        await pool.query('DELETE FROM device_locks WHERE user_id = ?', [studentId]);

        // Get student details for notification
        const [student] = await pool.query('SELECT name, email FROM users WHERE id = ?', [studentId]);

        return res.json({
            success: true,
            message: `Device lock successfully reset for ${student[0] ? student[0].name : 'student'}. The next device they use to log in will be automatically registered and locked.`
        });
    } catch (err) {
        console.error('Error resetting device lock:', err);
        return res.status(500).json({ error: 'Failed to reset device lock' });
    }
});

// 4. Get Locked Students (Missed Period 1 OTP Cutoff at 9:05 AM)
router.get('/locked-students', authenticate, authorizeRoles('hod', 'principal'), async (req, res) => {
    try {
        const department = req.user.role === 'principal' ? (req.query.department || 'IT') : req.user.department;
        const today = new Date().toISOString().slice(0, 10);

        // Fetch students in department
        const [students] = await pool.query(
            `SELECT u.id, u.name, u.email, u.roll_number, u.department, u.year_of_study,
                    sdl.reason as day_lock_reason,
                    sdl.first_otp_at,
                    sdl.is_locked_out,
                    (SELECT COUNT(*) FROM attendance_records ar WHERE ar.student_id = u.id AND ar.date = ? AND ar.period_id = 1 AND (ar.status = 'present' OR ar.status = 'od')) as p1_attended,
                    (SELECT COUNT(*) FROM sports_od_students sos JOIN sports_od_passes sop ON sos.pass_id = sop.id WHERE sos.student_id = u.id AND ? BETWEEN sop.from_date AND sop.to_date AND (sop.status = 'active' OR sop.status = 'approved')) as has_sports_od
             FROM users u
             LEFT JOIN student_day_locks sdl ON u.id = sdl.student_id AND sdl.date = ?
             WHERE u.role = "student" AND u.department = ?
             ORDER BY u.name ASC`,
            [today, today, today, department]
        );

        // Identify students who missed Period 1 and don't have sports OD
        const lockedList = students
            .filter(st => st.p1_attended === 0 && st.has_sports_od === 0)
            .map(st => ({
                id: st.id,
                name: st.name,
                email: st.email,
                roll_number: st.roll_number,
                year_of_study: st.year_of_study,
                isHodUnlocked: st.day_lock_reason === 'HOD_UNLOCKED',
                unlockedAt: st.day_lock_reason === 'HOD_UNLOCKED' ? st.first_otp_at : null,
                status: st.day_lock_reason === 'HOD_UNLOCKED' ? 'unlocked' : 'locked'
            }));

        return res.json({ success: true, lockedStudents: lockedList, count: lockedList.length });
    } catch (err) {
        console.error('Error fetching locked students for HOD:', err);
        return res.status(500).json({ error: 'Failed to fetch locked students' });
    }
});

// 5. HOD Unlock Day Attendance for Student
router.post('/unlock-student-day', authenticate, authorizeRoles('hod', 'principal'), async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) {
            return res.status(400).json({ error: 'Student ID is required' });
        }
        const today = new Date().toISOString().slice(0, 10);

        await pool.query(
            `INSERT INTO student_day_locks (student_id, date, first_otp_at, is_locked_out, reason)
             VALUES (?, ?, NOW(), 0, 'HOD_UNLOCKED')
             ON DUPLICATE KEY UPDATE is_locked_out = 0, reason = 'HOD_UNLOCKED', first_otp_at = NOW()`,
            [studentId, today]
        );

        const [st] = await pool.query('SELECT name FROM users WHERE id = ?', [studentId]);
        const studentName = st[0] ? st[0].name : 'Student';

        return res.json({
            success: true,
            message: `Day Attendance unlocked for ${studentName}! The student is now authorized to select their classroom and submit OTP for remaining periods today.`
        });
    } catch (err) {
        console.error('Error unlocking student day:', err);
        return res.status(500).json({ error: 'Failed to unlock student day' });
    }
});

// 6. HOD Relock Day Attendance for Student
router.post('/relock-student-day', authenticate, authorizeRoles('hod', 'principal'), async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) {
            return res.status(400).json({ error: 'Student ID is required' });
        }
        const today = new Date().toISOString().slice(0, 10);

        await pool.query(
            `INSERT INTO student_day_locks (student_id, date, is_locked_out, reason)
             VALUES (?, ?, 1, 'LOCKED_BY_HOD')
             ON DUPLICATE KEY UPDATE is_locked_out = 1, reason = 'LOCKED_BY_HOD'`,
            [studentId, today]
        );

        return res.json({
            success: true,
            message: 'Day attendance re-locked for student.'
        });
    } catch (err) {
        console.error('Error re-locking student day:', err);
        return res.status(500).json({ error: 'Failed to re-lock student day' });
    }
});

module.exports = router;
