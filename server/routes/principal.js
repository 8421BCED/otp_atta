const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// 1. Principal Campus-Wide Overview
router.get('/overview', authenticate, authorizeRoles('principal'), async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);

        // Total Students
        const [totalStudents] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');

        // Total Students Present Today
        const [totalPresent] = await pool.query(
            'SELECT COUNT(DISTINCT student_id) as count FROM attendance_records WHERE date = ? AND status = "present"',
            [today]
        );

        // Total Faculty / Staff
        const [totalStaff] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role IN ("staff", "hod")');

        // Total Rooms
        const [totalRooms] = await pool.query('SELECT COUNT(*) as count FROM rooms');

        // Department-wise Breakdown
        const [deptStats] = await pool.query(
            `SELECT u.department, 
                    COUNT(DISTINCT u.id) as total_students,
                    COUNT(DISTINCT ar.student_id) as present_today
             FROM users u
             LEFT JOIN attendance_records ar ON u.id = ar.student_id AND ar.date = ? AND ar.status = "present"
             WHERE u.role = "student"
             GROUP BY u.department
             ORDER BY u.department ASC`,
            [today]
        );

        // Building Occupancy Breakdown
        const [buildingOccupancy] = await pool.query(
            `SELECT b.id as building_id, b.name as building_name, b.code,
                    COUNT(DISTINCT r.id) as room_count,
                    COUNT(DISTINCT ar.student_id) as students_present
             FROM buildings b
             JOIN rooms r ON b.id = r.building_id
             LEFT JOIN attendance_records ar ON r.id = ar.room_id AND ar.date = ? AND ar.status = "present"
             GROUP BY b.id, b.name, b.code
             ORDER BY students_present DESC`,
            [today]
        );

        // Detailed Room Heatmap
        const [roomHeatmap] = await pool.query(
            `SELECT r.id as room_id, r.room_number, r.name as room_name, r.capacity, r.department,
                    b.name as building_name, f.name as floor_name,
                    COUNT(DISTINCT ar.student_id) as current_occupancy
             FROM rooms r
             JOIN buildings b ON r.building_id = b.id
             JOIN floors f ON r.floor_id = f.id
             LEFT JOIN attendance_records ar ON r.id = ar.room_id AND ar.date = ? AND ar.status = "present"
             GROUP BY r.id, r.room_number, r.name, r.capacity, r.department, b.name, f.name
             ORDER BY current_occupancy DESC`,
            [today]
        );

        return res.json({
            summary: {
                totalStudents: totalStudents[0].count,
                totalPresent: totalPresent[0].count,
                totalStaff: totalStaff[0].count,
                totalRooms: totalRooms[0].count,
                overallAttendanceRate: totalStudents[0].count > 0 
                    ? Math.round((totalPresent[0].count / totalStudents[0].count) * 100) 
                    : 0
            },
            deptStats,
            buildingOccupancy,
            roomHeatmap
        });
    } catch (err) {
        console.error('Error fetching Principal overview:', err);
        return res.status(500).json({ error: 'Failed to fetch campus overview' });
    }
});

module.exports = router;
