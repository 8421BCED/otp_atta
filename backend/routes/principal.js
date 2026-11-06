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

// 2. Principal: Search & List All Staff and HODs with Live Location
router.get('/staffs', authenticate, authorizeRoles('principal'), async (req, res) => {
    try {
        const { q = '', department = 'all', role = 'all' } = req.query;
        let query = `
            SELECT u.id, u.name, u.email, u.role, u.department, u.designation, u.roll_number as staff_code, u.phone,
                   latest_move.room_number as current_room_number,
                   latest_move.room_name as current_room_name,
                   latest_move.building_name as current_building_name,
                   latest_move.floor_name as current_floor_name,
                   latest_move.timestamp as last_seen_at
            FROM users u
            LEFT JOIN (
                SELECT sm1.staff_id, r.room_number, r.name as room_name, b.name as building_name, f.name as floor_name, sm1.timestamp
                FROM staff_movements sm1
                JOIN rooms r ON sm1.to_room_id = r.id
                JOIN buildings b ON r.building_id = b.id
                JOIN floors f ON r.floor_id = f.id
                INNER JOIN (
                    SELECT staff_id, MAX(id) as max_id
                    FROM staff_movements
                    GROUP BY staff_id
                ) sm2 ON sm1.id = sm2.max_id
            ) latest_move ON u.id = latest_move.staff_id
            WHERE u.role IN ('staff', 'hod')
        `;
        const params = [];

        if (q.trim()) {
            query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.roll_number LIKE ?)';
            const term = `%${q.trim()}%`;
            params.push(term, term, term);
        }

        if (department !== 'all') {
            query += ' AND u.department = ?';
            params.push(department);
        }

        if (role !== 'all') {
            query += ' AND u.role = ?';
            params.push(role);
        }

        query += ' ORDER BY u.role ASC, u.department ASC, u.name ASC';

        const [staffs] = await pool.query(query, params);
        return res.json({ staffs });
    } catch (err) {
        console.error('Error fetching staff list for Principal:', err);
        return res.status(500).json({ error: 'Failed to fetch staff directory' });
    }
});

// 3. Principal: Detailed Staff / HOD Movement & Calendar History
router.get('/staff-details/:staffId', authenticate, authorizeRoles('principal'), async (req, res) => {
    try {
        const { staffId } = req.params;
        const [users] = await pool.query(
            'SELECT id, name, email, role, department, designation, roll_number as staff_code, phone FROM users WHERE id = ?',
            [staffId]
        );
        if (users.length === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        const staff = users[0];

        const today = new Date().toISOString().slice(0, 10);
        const yDate = new Date();
        yDate.setDate(yDate.getDate() - 1);
        const yesterday = yDate.toISOString().slice(0, 10);

        // Movements history
        const [movements] = await pool.query(
            `SELECT sm.*, r.room_number, r.name as room_name, b.name as building_name, f.name as floor_name,
                    p.name as period_name, p.start_time, p.end_time
             FROM staff_movements sm
             JOIN rooms r ON sm.to_room_id = r.id
             JOIN buildings b ON r.building_id = b.id
             JOIN floors f ON r.floor_id = f.id
             LEFT JOIN periods p ON sm.period_id = p.id
             WHERE sm.staff_id = ?
             ORDER BY sm.timestamp DESC`,
            [staffId]
        );

        // Today's locations
        const todayMovements = movements.filter(m => {
            const mDate = new Date(m.timestamp).toISOString().slice(0, 10);
            return mDate === today || m.date === today;
        });

        // Yesterday's locations
        const yesterdayMovements = movements.filter(m => {
            const mDate = new Date(m.timestamp).toISOString().slice(0, 10);
            return mDate === yesterday || m.date === yesterday;
        });

        return res.json({
            staff,
            currentLocation: movements.length > 0 ? movements[0] : null,
            todayMovements,
            yesterdayMovements,
            allMovements: movements
        });
    } catch (err) {
        console.error('Error fetching staff details for Principal:', err);
        return res.status(500).json({ error: 'Failed to fetch staff movement history' });
    }
});

module.exports = router;

