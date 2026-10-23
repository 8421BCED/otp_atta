const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper to format date YYYY-MM-DD
const formatDate = (d) => {
    const date = new Date(d);
    return date.toISOString().slice(0, 10);
};

// 1. Get Sports Dashboard Stats
router.get('/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);

        const [activePasses] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM sports_od_passes 
            WHERE status = 'active' AND from_date <= ? AND to_date >= ?
        `, [today, today]);

        const [activeStudents] = await pool.query(`
            SELECT COUNT(DISTINCT sos.student_id) as count 
            FROM sports_od_students sos
            JOIN sports_od_passes sop ON sos.pass_id = sop.id
            WHERE sop.status = 'active' AND sop.from_date <= ? AND sop.to_date >= ?
        `, [today, today]);

        const [upcomingEvents] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM sports_od_passes 
            WHERE status = 'active' AND from_date > ?
        `, [today]);

        const [totalPasses] = await pool.query(`
            SELECT COUNT(*) as count FROM sports_od_passes
        `);

        return res.json({
            activePassesCount: activePasses[0].count || 0,
            activeStudentsCount: activeStudents[0].count || 0,
            upcomingEventsCount: upcomingEvents[0].count || 0,
            totalPassesCount: totalPasses[0].count || 0
        });
    } catch (err) {
        console.error('Error fetching sports stats:', err);
        return res.status(500).json({ error: 'Failed to fetch sports stats' });
    }
});

// 2. Search Students for Squad Selection (Name, Roll, Dept, Year)
router.get('/students-search', async (req, res) => {
    try {
        const { q, department } = req.query;
        let query = `
            SELECT id, name, email, roll_number, department, year_of_study 
            FROM users 
            WHERE role = 'student' AND is_active = 1
        `;
        const params = [];

        if (department && department !== 'all') {
            query += ' AND department = ?';
            params.push(department);
        }

        if (q && q.trim()) {
            const search = `%${q.trim()}%`;
            query += ' AND (name LIKE ? OR roll_number LIKE ? OR email LIKE ?)';
            params.push(search, search, search);
        }

        query += ' ORDER BY department ASC, name ASC LIMIT 60';

        const [students] = await pool.query(query, params);
        return res.json({ students });
    } catch (err) {
        console.error('Error searching students for sports:', err);
        return res.status(500).json({ error: 'Failed to search students' });
    }
});

// 3. List All Sports OD Passes
router.get('/passes', async (req, res) => {
    try {
        const [passes] = await pool.query(`
            SELECT 
                sop.id, sop.event_name, sop.sport_category, sop.venue,
                DATE_FORMAT(sop.from_date, '%Y-%m-%d') as from_date,
                DATE_FORMAT(sop.to_date, '%Y-%m-%d') as to_date,
                sop.is_all_day, sop.from_period, sop.to_period, sop.reason, sop.status, sop.created_at,
                u.name as creator_name,
                COUNT(sos.student_id) as student_count
            FROM sports_od_passes sop
            LEFT JOIN users u ON sop.created_by = u.id
            LEFT JOIN sports_od_students sos ON sop.id = sos.pass_id
            GROUP BY sop.id
            ORDER BY sop.from_date DESC, sop.id DESC
        `);

        return res.json({ passes });
    } catch (err) {
        console.error('Error listing sports passes:', err);
        return res.status(500).json({ error: 'Failed to list passes' });
    }
});

// 4. Get Pass Details with Enrolled Athletes
router.get('/passes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [passes] = await pool.query(`
            SELECT 
                sop.id, sop.event_name, sop.sport_category, sop.venue,
                DATE_FORMAT(sop.from_date, '%Y-%m-%d') as from_date,
                DATE_FORMAT(sop.to_date, '%Y-%m-%d') as to_date,
                sop.is_all_day, sop.from_period, sop.to_period, sop.reason, sop.status, sop.created_at,
                u.name as creator_name 
            FROM sports_od_passes sop
            LEFT JOIN users u ON sop.created_by = u.id
            WHERE sop.id = ?
        `, [id]);

        if (passes.length === 0) {
            return res.status(404).json({ error: 'Sports OD Pass not found' });
        }

        const pass = passes[0];

        const [students] = await pool.query(`
            SELECT u.id, u.name, u.email, u.roll_number, u.department, u.year_of_study, sos.notes, sos.added_at
            FROM sports_od_students sos
            JOIN users u ON sos.student_id = u.id
            WHERE sos.pass_id = ?
            ORDER BY u.department ASC, u.name ASC
        `, [id]);

        return res.json({ pass, students });
    } catch (err) {
        console.error('Error fetching pass details:', err);
        return res.status(500).json({ error: 'Failed to fetch pass details' });
    }
});

// 5. Create New Sports OD Pass & Auto-Mark Attendance as 'od'
router.post('/passes', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const {
            event_name,
            sport_category = 'General Sports',
            venue = 'FXEC Sports Arena',
            from_date,
            to_date,
            is_all_day = true,
            from_period = 1,
            to_period = 7,
            reason = '',
            student_ids = [],
            created_by = 1
        } = req.body;

        if (!event_name || !from_date || !to_date) {
            conn.release();
            return res.status(400).json({ error: 'Event name, Start Date, and End Date are required.' });
        }

        if (!student_ids || student_ids.length === 0) {
            conn.release();
            return res.status(400).json({ error: 'Please select at least one student athlete to issue the sports OD pass.' });
        }

        // 1. Insert into sports_od_passes
        const [passResult] = await conn.query(`
            INSERT INTO sports_od_passes 
            (event_name, sport_category, venue, from_date, to_date, is_all_day, from_period, to_period, reason, created_by, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `, [
            event_name.trim(),
            sport_category.trim(),
            venue.trim(),
            from_date,
            to_date,
            is_all_day ? 1 : 0,
            from_period,
            to_period,
            reason.trim(),
            created_by
        ]);

        const passId = passResult.insertId;

        // 2. Insert selected students into sports_od_students
        for (const st of student_ids) {
            const studentId = typeof st === 'object' ? st.id : st;
            const note = typeof st === 'object' ? (st.notes || '') : '';
            await conn.query(`
                INSERT INTO sports_od_students (pass_id, student_id, notes)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE notes = VALUES(notes)
            `, [passId, studentId, note]);
        }

        // 3. Auto-populate / ensure attendance records with status = 'od'
        // For each date in the range [from_date, to_date]
        // Fetch a default room (e.g. Ground / Room 1) and periods
        const [periods] = await conn.query('SELECT id, period_number FROM periods ORDER BY id ASC');
        const [defaultRoom] = await conn.query('SELECT id FROM rooms LIMIT 1');
        const roomId = defaultRoom.length > 0 ? defaultRoom[0].id : 1;

        const startDate = new Date(from_date);
        const endDate = new Date(to_date);

        const targetPeriods = periods.filter(p => {
            if (is_all_day) return true;
            return p.period_number >= from_period && p.period_number <= to_period;
        });

        // Loop through dates
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const curDateStr = d.toISOString().slice(0, 10);

            for (const st of student_ids) {
                const studentId = typeof st === 'object' ? st.id : st;

                // Unlock morning day lock if any exists for this date
                await conn.query(`
                    INSERT INTO student_day_locks (student_id, date, first_otp_at, is_locked_out)
                    VALUES (?, ?, NOW(), 0)
                    ON DUPLICATE KEY UPDATE is_locked_out = 0
                `, [studentId, curDateStr]);

                // Insert / update attendance records for each period as 'od'
                for (const p of targetPeriods) {
                    await conn.query(`
                        INSERT INTO attendance_records 
                        (student_id, period_id, room_id, staff_id, date, status, otp_used)
                        VALUES (?, ?, ?, ?, ?, 'od', 'SPORTS')
                        ON DUPLICATE KEY UPDATE status = 'od', otp_used = 'SPORTS'
                    `, [studentId, p.id, roomId, created_by, curDateStr]);
                }
            }
        }

        await conn.commit();
        conn.release();

        return res.json({
            success: true,
            message: `Sports OD Pass issued successfully for "${event_name}". ${student_ids.length} student athletes are now granted OTP exemption and 100% On-Duty attendance credit.`,
            passId
        });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('Error creating sports pass:', err);
        return res.status(500).json({ error: 'Failed to create sports OD pass' });
    }
});

// 6. Delete / Revoke Pass
router.delete('/passes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM sports_od_passes WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Sports OD Pass deleted successfully.' });
    } catch (err) {
        console.error('Error deleting sports pass:', err);
        return res.status(500).json({ error: 'Failed to delete sports pass' });
    }
});

// 7. Check Student Active Sports OD Pass for Today
router.get('/student-active-pass/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const targetDate = req.query.date || new Date().toISOString().slice(0, 10);

        const [active] = await pool.query(`
            SELECT 
                sop.id, sop.event_name, sop.sport_category, sop.venue, 
                DATE_FORMAT(sop.from_date, '%Y-%m-%d') as from_date,
                DATE_FORMAT(sop.to_date, '%Y-%m-%d') as to_date,
                sop.is_all_day, sop.from_period, sop.to_period,
                u.name as issued_by, sos.notes
            FROM sports_od_students sos
            JOIN sports_od_passes sop ON sos.pass_id = sop.id
            JOIN users u ON sop.created_by = u.id
            WHERE sos.student_id = ? 
              AND sop.status = 'active'
              AND ? BETWEEN sop.from_date AND sop.to_date
            ORDER BY sop.id DESC
            LIMIT 1
        `, [studentId, targetDate]);

        if (active.length === 0) {
            return res.json({ hasActivePass: false });
        }

        return res.json({
            hasActivePass: true,
            pass: active[0]
        });
    } catch (err) {
        console.error('Error checking student sports pass:', err);
        return res.status(500).json({ error: 'Failed to check active sports pass' });
    }
});

module.exports = router;
