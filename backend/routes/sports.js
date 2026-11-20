const express = require('express');
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { todayIst, dateRange } = require('../utils/time');
const { groupOf, sameGroup } = require('../utils/departments');

const router = express.Router();

const MANAGERS = ['pt', 'hod', 'principal'];
const STAFF_ROLES = ['pt', 'staff', 'hod', 'principal'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.use(authenticate);

// 1. Dashboard stats
router.get('/stats', authorizeRoles(...MANAGERS), async (req, res) => {
    try {
        const today = todayIst();
        const [[active]] = await pool.query(
            `SELECT COUNT(*) as count FROM sports_od_passes WHERE status = 'active' AND from_date <= ? AND to_date >= ?`, [today, today]);
        const [[students]] = await pool.query(
            `SELECT COUNT(DISTINCT sos.student_id) as count FROM sports_od_students sos
             JOIN sports_od_passes sop ON sos.pass_id = sop.id
             WHERE sop.status = 'active' AND sop.from_date <= ? AND sop.to_date >= ?`, [today, today]);
        const [[upcoming]] = await pool.query(
            `SELECT COUNT(*) as count FROM sports_od_passes WHERE status = 'active' AND from_date > ?`, [today]);
        const [[total]] = await pool.query('SELECT COUNT(*) as count FROM sports_od_passes');

        return res.json({
            activePassesCount: active.count || 0,
            activeStudentsCount: students.count || 0,
            upcomingEventsCount: upcoming.count || 0,
            totalPassesCount: total.count || 0
        });
    } catch (err) {
        console.error('Error fetching sports stats:', err);
        return res.status(500).json({ error: 'Failed to fetch sports stats' });
    }
});

// 2. Student search for squad selection (HODs only see their own department)
router.get('/students-search', authorizeRoles(...MANAGERS), async (req, res) => {
    try {
        const { q } = req.query;
        let { department } = req.query;
        if (req.user.role === 'hod') department = req.user.department;

        let query = `SELECT id, name, email, roll_number, department, year_of_study
                     FROM users WHERE role = 'student' AND is_active = 1`;
        const params = [];
        if (department && department !== 'all') { query += ' AND department IN (?)'; params.push(groupOf(department)); }
        if (q && q.trim()) {
            const search = `%${q.trim()}%`;
            query += ' AND (name LIKE ? OR email LIKE ? OR roll_number LIKE ?)';
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

const PASS_COLUMNS = `sop.id, sop.event_name, sop.sport_category, sop.venue, sop.from_date, sop.to_date,
    sop.is_all_day, sop.from_period, sop.to_period, sop.reason, sop.status, sop.created_at, sop.created_by`;

// 3. List passes (HODs see passes they created)
router.get('/passes', authorizeRoles(...MANAGERS), async (req, res) => {
    try {
        const ownOnly = req.user.role === 'hod';
        const [passes] = await pool.query(
            `SELECT ${PASS_COLUMNS}, u.name as creator_name, COUNT(sos.student_id) as student_count
             FROM sports_od_passes sop
             LEFT JOIN users u ON sop.created_by = u.id
             LEFT JOIN sports_od_students sos ON sop.id = sos.pass_id
             ${ownOnly ? 'WHERE sop.created_by = ?' : ''}
             GROUP BY sop.id
             ORDER BY sop.from_date DESC, sop.id DESC`,
            ownOnly ? [req.user.id] : []
        );
        return res.json({ passes });
    } catch (err) {
        console.error('Error listing sports passes:', err);
        return res.status(500).json({ error: 'Failed to list passes' });
    }
});

// 4. Pass details
router.get('/passes/:id', authorizeRoles(...MANAGERS), async (req, res) => {
    try {
        const { id } = req.params;
        const [passes] = await pool.query(
            `SELECT ${PASS_COLUMNS}, u.name as creator_name
             FROM sports_od_passes sop LEFT JOIN users u ON sop.created_by = u.id WHERE sop.id = ?`, [id]);
        if (passes.length === 0) return res.status(404).json({ error: 'Pass not found' });
        if (req.user.role === 'hod' && passes[0].created_by !== req.user.id) {
            return res.status(403).json({ error: 'You can only view passes you issued' });
        }

        const [students] = await pool.query(
            `SELECT u.id, u.name, u.email, u.roll_number, u.department, u.year_of_study, sos.notes, sos.added_at
             FROM sports_od_students sos JOIN users u ON sos.student_id = u.id
             WHERE sos.pass_id = ? ORDER BY u.department ASC, u.name ASC`, [id]);

        return res.json({ pass: passes[0], students });
    } catch (err) {
        console.error('Error fetching pass details:', err);
        return res.status(500).json({ error: 'Failed to fetch pass details' });
    }
});

// 5. Create a pass and credit On-Duty attendance
router.post('/passes', authorizeRoles(...MANAGERS), async (req, res) => {
    const conn = await pool.getConnection();
    try {
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
            student_ids = []
        } = req.body || {};
        const createdBy = req.user.id;

        if (!event_name || !DATE_RE.test(from_date || '') || !DATE_RE.test(to_date || '') || to_date < from_date) {
            conn.release();
            return res.status(400).json({ error: 'Event name and a valid date range are required.' });
        }
        const days = dateRange(from_date, to_date);
        if (days.length > 60) {
            conn.release();
            return res.status(400).json({ error: 'A pass can cover at most 60 days.' });
        }

        const ids = [...new Set((Array.isArray(student_ids) ? student_ids : [])
            .map((s) => Number(typeof s === 'object' && s ? s.id : s))
            .filter((n) => Number.isInteger(n) && n > 0))];
        if (ids.length === 0) {
            conn.release();
            return res.status(400).json({ error: 'Select at least one student.' });
        }
        const notesById = new Map((Array.isArray(student_ids) ? student_ids : [])
            .filter((s) => s && typeof s === 'object')
            .map((s) => [Number(s.id), String(s.notes || '').slice(0, 250)]));

        // Only real, active students; HODs only from their own department.
        const [valid] = await conn.query(
            `SELECT id, department FROM users WHERE role = 'student' AND is_active = 1 AND id IN (?)`, [ids]);
        const allowed = valid.filter((u) => req.user.role !== 'hod' || sameGroup(req.user.department, u.department)).map((u) => u.id);
        if (allowed.length === 0) {
            conn.release();
            return res.status(400).json({ error: 'None of the selected students can be added to this pass.' });
        }

        await conn.beginTransaction();

        const [passResult] = await conn.query(
            `INSERT INTO sports_od_passes
             (event_name, sport_category, venue, from_date, to_date, is_all_day, from_period, to_period, reason, created_by, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [String(event_name).trim().slice(0, 150), String(sport_category).trim().slice(0, 100), String(venue).trim().slice(0, 150),
                from_date, to_date, is_all_day ? 1 : 0, parseInt(from_period, 10) || 1, parseInt(to_period, 10) || 7,
                String(reason).trim(), createdBy]
        );
        const passId = passResult.insertId;

        for (const studentId of allowed) {
            await conn.query(
                `INSERT INTO sports_od_students (pass_id, student_id, notes) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE notes = VALUES(notes)`,
                [passId, studentId, notesById.get(studentId) || '']
            );
        }

        const [periods] = await conn.query('SELECT id, period_number, is_break FROM periods ORDER BY id ASC');
        const [defaultRoom] = await conn.query('SELECT id FROM rooms ORDER BY id LIMIT 1');
        const roomId = defaultRoom.length > 0 ? defaultRoom[0].id : 1;

        const targetPeriods = periods.filter((p) => {
            if (p.is_break) return false;
            if (is_all_day) return true;
            return p.period_number >= from_period && p.period_number <= to_period;
        });

        for (const day of days) {
            for (const studentId of allowed) {
                await conn.query(
                    `INSERT INTO student_day_locks (student_id, date, first_otp_at, is_locked_out, reason)
                     VALUES (?, ?, NOW(), 0, 'SPORTS_OD')
                     ON DUPLICATE KEY UPDATE is_locked_out = 0`,
                    [studentId, day]
                );
                for (const p of targetPeriods) {
                    // Never downgrade a genuine "present" record.
                    await conn.query(
                        `INSERT INTO attendance_records (student_id, period_id, room_id, staff_id, date, status, otp_used)
                         VALUES (?, ?, ?, ?, ?, 'od', 'SPORTS')
                         ON DUPLICATE KEY UPDATE status = IF(status = 'present', status, 'od'),
                                                 otp_used = IF(status = 'present', otp_used, 'SPORTS')`,
                        [studentId, p.id, roomId, createdBy, day]
                    );
                }
            }
        }

        await conn.commit();
        conn.release();

        return res.json({
            success: true,
            message: `Pass issued for "${event_name}". ${allowed.length} student${allowed.length === 1 ? '' : 's'} credited On-Duty.`,
            skipped: ids.length - allowed.length,
            passId
        });
    } catch (err) {
        try { await conn.rollback(); } catch (e) { /* ignore */ }
        conn.release();
        console.error('Error creating sports pass:', err);
        return res.status(500).json({ error: 'Failed to create sports OD pass' });
    }
});

// 6. Revoke a pass: removes only the On-Duty records this pass created
router.delete('/passes/:id', authorizeRoles(...MANAGERS), async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { id } = req.params;
        const [passes] = await conn.query('SELECT * FROM sports_od_passes WHERE id = ?', [id]);
        if (passes.length === 0) {
            conn.release();
            return res.status(404).json({ error: 'Pass not found' });
        }
        const pass = passes[0];
        if (req.user.role === 'hod' && pass.created_by !== req.user.id) {
            conn.release();
            return res.status(403).json({ error: 'You can only revoke passes you issued' });
        }

        await conn.beginTransaction();
        const [students] = await conn.query('SELECT student_id FROM sports_od_students WHERE pass_id = ?', [id]);
        const studentIds = students.map((s) => s.student_id);

        if (studentIds.length > 0) {
            await conn.query(
                `DELETE FROM attendance_records
                 WHERE student_id IN (?) AND date BETWEEN ? AND ? AND status = 'od' AND otp_used = 'SPORTS'`,
                [studentIds, pass.from_date, pass.to_date]
            );
        }
        await conn.query('DELETE FROM sports_od_students WHERE pass_id = ?', [id]);
        await conn.query('DELETE FROM sports_od_passes WHERE id = ?', [id]);
        await conn.commit();
        conn.release();

        return res.json({ success: true, message: 'Pass revoked and its On-Duty records removed.' });
    } catch (err) {
        try { await conn.rollback(); } catch (e) { /* ignore */ }
        conn.release();
        console.error('Error deleting sports pass:', err);
        return res.status(500).json({ error: 'Failed to delete sports pass' });
    }
});

// 7. Active pass for a student: the student themself, or staff
router.get('/student-active-pass/:studentId', async (req, res) => {
    try {
        const studentId = Number(req.params.studentId);
        const isSelf = req.user.role === 'student' && req.user.id === studentId;
        if (!isSelf && !STAFF_ROLES.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const targetDate = DATE_RE.test(req.query.date || '') ? req.query.date : todayIst();
        const [active] = await pool.query(
            `SELECT sop.id, sop.event_name, sop.sport_category, sop.venue, sop.from_date, sop.to_date,
                    sop.is_all_day, sop.from_period, sop.to_period, u.name as issued_by, sos.notes
             FROM sports_od_students sos
             JOIN sports_od_passes sop ON sos.pass_id = sop.id
             JOIN users u ON sop.created_by = u.id
             WHERE sos.student_id = ? AND sop.status = 'active' AND ? BETWEEN sop.from_date AND sop.to_date
             ORDER BY sop.id DESC LIMIT 1`,
            [studentId, targetDate]
        );

        if (active.length === 0) return res.json({ hasActivePass: false });
        return res.json({ hasActivePass: true, pass: active[0] });
    } catch (err) {
        console.error('Error checking student sports pass:', err);
        return res.status(500).json({ error: 'Failed to check active sports pass' });
    }
});

module.exports = router;
