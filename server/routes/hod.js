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

module.exports = router;
