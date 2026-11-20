const express = require('express');
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { todayIst, dateRange } = require('../utils/time');
const { groupOf, sameGroup } = require('../utils/departments');

const router = express.Router();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.use(authenticate);

// 1. Student: submit a leave / On-Duty application
router.post('/apply', authorizeRoles('student'), async (req, res) => {
    try {
        const studentId = req.user.id;
        const {
            type, eventName, category, venue, fromDate, toDate,
            isAllDay, fromPeriod, toPeriod, reason, mentorId
        } = req.body || {};

        if (!eventName || !reason || !DATE_RE.test(fromDate || '') || !DATE_RE.test(toDate || '')) {
            return res.status(400).json({ error: 'Event name, valid dates and a reason are required.' });
        }
        if (toDate < fromDate) return res.status(400).json({ error: 'The end date cannot be before the start date.' });
        if (dateRange(fromDate, toDate).length > 31) return res.status(400).json({ error: 'An application can cover at most 31 days.' });

        const kind = type === 'external' ? 'external' : 'internal';
        const allDay = isAllDay !== false;

        // The mentor must be a faculty member of the student's own department.
        let mentor = null;
        if (mentorId) {
            const [m] = await pool.query(
                `SELECT id FROM users WHERE id = ? AND role IN ('staff', 'hod') AND department IN (?)`,
                [parseInt(mentorId, 10), groupOf(req.user.department)]
            );
            mentor = m.length > 0 ? m[0].id : null;
        }

        const [result] = await pool.query(
            `INSERT INTO leave_applications
             (student_id, type, event_name, category, venue, from_date, to_date, is_all_day, from_period, to_period, reason, mentor_id, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_mentor')`,
            [
                studentId,
                kind,
                String(eventName).trim().slice(0, 250),
                String(category || 'Symposium / Hackathon').slice(0, 100),
                venue ? String(venue).trim().slice(0, 250) : (kind === 'internal' ? 'FXEC Campus' : 'External College / Venue'),
                fromDate,
                toDate,
                allDay ? 1 : 0,
                allDay ? 1 : Math.min(7, Math.max(1, parseInt(fromPeriod, 10) || 1)),
                allDay ? 7 : Math.min(7, Math.max(1, parseInt(toPeriod, 10) || 7)),
                String(reason).trim(),
                mentor
            ]
        );

        return res.json({
            success: true,
            message: `Application for "${String(eventName).trim()}" submitted. It goes to your faculty mentor first, then to your HOD.`,
            applicationId: result.insertId
        });
    } catch (err) {
        console.error('Error applying for leave:', err);
        return res.status(500).json({ error: 'Failed to submit leave application' });
    }
});

// 2. Student: my applications
router.get('/my-leaves', authorizeRoles('student'), async (req, res) => {
    try {
        const [leaves] = await pool.query(
            `SELECT l.*, m.name as mentor_name, m.email as mentor_email
             FROM leave_applications l LEFT JOIN users m ON l.mentor_id = m.id
             WHERE l.student_id = ? ORDER BY l.id DESC`, [req.user.id]);
        return res.json({ success: true, leaves });
    } catch (err) {
        console.error('Error fetching student leaves:', err);
        return res.status(500).json({ error: 'Failed to fetch student leaves' });
    }
});

// 3. Faculty: requests routed to me, or unassigned in my department
router.get('/mentor-requests', authorizeRoles('staff', 'hod'), async (req, res) => {
    try {
        const [requests] = await pool.query(
            `SELECT l.*, u.name as student_name, u.email as student_email, u.roll_number, u.department, u.year_of_study,
                    m.name as mentor_name
             FROM leave_applications l
             JOIN users u ON l.student_id = u.id
             LEFT JOIN users m ON l.mentor_id = m.id
             WHERE (l.mentor_id = ? OR (l.mentor_id IS NULL AND u.department IN (?)))
             ORDER BY l.id DESC`, [req.user.id, groupOf(req.user.department)]);
        return res.json({ success: true, requests });
    } catch (err) {
        console.error('Error fetching mentor leave requests:', err);
        return res.status(500).json({ error: 'Failed to fetch mentor leave requests' });
    }
});

// 4. Faculty: endorse and forward to the HOD, or reject
router.post('/mentor-review', authorizeRoles('staff', 'hod'), async (req, res) => {
    try {
        const { applicationId, action, remarks } = req.body || {};
        if (!applicationId || !['forward', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Application ID and a valid action (forward or reject) are required' });
        }

        const [rows] = await pool.query(
            `SELECT l.id, l.status, l.mentor_id, u.department
             FROM leave_applications l JOIN users u ON l.student_id = u.id WHERE l.id = ?`, [applicationId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Application not found' });
        const app = rows[0];

        const isAssigned = app.mentor_id === req.user.id;
        const isUnassignedSameDept = app.mentor_id === null && sameGroup(req.user.department, app.department);
        if (!isAssigned && !isUnassignedSameDept) {
            return res.status(403).json({ error: 'This application is not assigned to you' });
        }
        if (app.status !== 'pending_mentor') {
            return res.status(409).json({ error: 'This application has already been reviewed by the mentor' });
        }

        await pool.query(
            `UPDATE leave_applications
             SET status = ?, mentor_id = ?, mentor_remarks = ?, mentor_reviewed_at = NOW()
             WHERE id = ? AND status = 'pending_mentor'`,
            [
                action === 'forward' ? 'pending_hod' : 'rejected',
                req.user.id,
                String(remarks || (action === 'forward' ? 'Recommended and forwarded to the HOD.' : 'Rejected by mentor.')).slice(0, 2000),
                applicationId
            ]
        );

        return res.json({
            success: true,
            message: action === 'forward'
                ? 'Application endorsed and forwarded to the HOD for final approval.'
                : 'Application rejected.'
        });
    } catch (err) {
        console.error('Error in mentor review:', err);
        return res.status(500).json({ error: 'Failed to process mentor review' });
    }
});

// 5. HOD: department applications
router.get('/hod-requests', authorizeRoles('hod', 'principal'), async (req, res) => {
    try {
        const dept = req.user.role === 'principal' ? (req.query.department || 'IT') : req.user.department;
        const [requests] = await pool.query(
            `SELECT l.*, u.name as student_name, u.email as student_email, u.roll_number, u.department, u.year_of_study,
                    m.name as mentor_name, m.email as mentor_email
             FROM leave_applications l
             JOIN users u ON l.student_id = u.id
             LEFT JOIN users m ON l.mentor_id = m.id
             WHERE u.department IN (?)
             ORDER BY l.id DESC`, [groupOf(dept)]);
        return res.json({ success: true, requests });
    } catch (err) {
        console.error('Error fetching HOD leave requests:', err);
        return res.status(500).json({ error: 'Failed to fetch HOD leave requests' });
    }
});

// 6. HOD: final decision. Approval credits On-Duty attendance for the covered periods.
router.post('/hod-review', authorizeRoles('hod', 'principal'), async (req, res) => {
    const { applicationId, action, remarks } = req.body || {};
    if (!applicationId || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Application ID and a valid action (approve or reject) are required' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [appRows] = await conn.query(
            `SELECT l.*, u.department as student_department
             FROM leave_applications l JOIN users u ON l.student_id = u.id
             WHERE l.id = ? FOR UPDATE`, [applicationId]);
        if (appRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Application not found' });
        }
        const leave = appRows[0];

        if (req.user.role === 'hod' && !sameGroup(req.user.department, leave.student_department)) {
            await conn.rollback();
            return res.status(403).json({ error: 'This student belongs to another department' });
        }
        if (!['pending_hod', 'pending_mentor'].includes(leave.status)) {
            await conn.rollback();
            return res.status(409).json({ error: 'This application has already been decided' });
        }

        await conn.query(
            `UPDATE leave_applications SET status = ?, hod_remarks = ?, hod_reviewed_at = NOW() WHERE id = ?`,
            [
                action === 'approve' ? 'approved' : 'rejected',
                String(remarks || (action === 'approve' ? 'Sanctioned by HOD with On-Duty credit.' : 'Rejected by HOD.')).slice(0, 2000),
                applicationId
            ]
        );

        if (action === 'approve') {
            const [periods] = await conn.query('SELECT id, period_number, is_break FROM periods ORDER BY id ASC');
            const [defaultRoom] = await conn.query('SELECT id FROM rooms ORDER BY id LIMIT 1');
            const roomId = defaultRoom.length > 0 ? defaultRoom[0].id : 1;

            const targetPeriods = periods.filter((p) => {
                if (p.is_break) return false;
                if (leave.is_all_day) return true;
                return p.period_number >= leave.from_period && p.period_number <= leave.to_period;
            });

            for (const day of dateRange(leave.from_date, leave.to_date)) {
                await conn.query(
                    `INSERT INTO student_day_locks (student_id, date, first_otp_at, is_locked_out, reason)
                     VALUES (?, ?, NOW(), 0, 'HOD_UNLOCKED')
                     ON DUPLICATE KEY UPDATE is_locked_out = 0, reason = 'HOD_UNLOCKED'`,
                    [leave.student_id, day]
                );
                for (const p of targetPeriods) {
                    // Never downgrade a genuine "present" record to "od".
                    await conn.query(
                        `INSERT INTO attendance_records (student_id, period_id, room_id, staff_id, date, status, otp_used)
                         VALUES (?, ?, ?, ?, ?, 'od', 'HOD_LEAVE_APPROVED')
                         ON DUPLICATE KEY UPDATE status = IF(status = 'present', status, 'od'),
                                                 otp_used = IF(status = 'present', otp_used, 'HOD_LEAVE_APPROVED')`,
                        [leave.student_id, p.id, roomId, req.user.id, day]
                    );
                }
            }
        }

        await conn.commit();
        return res.json({
            success: true,
            message: action === 'approve'
                ? 'Application approved. The student has been credited On-Duty attendance.'
                : 'Application rejected.'
        });
    } catch (err) {
        try { await conn.rollback(); } catch (e) { /* ignore */ }
        console.error('Error in HOD review:', err);
        return res.status(500).json({ error: 'Failed to process HOD review' });
    } finally {
        conn.release();
    }
});

// 7. Mentors available to the signed-in student's department
router.get('/mentors', async (req, res) => {
    try {
        const dept = req.user.department || 'IT';
        const [mentors] = await pool.query(
            `SELECT id, name, email, department, designation FROM users
             WHERE role IN ('staff', 'hod') AND department IN (?) AND is_active = 1 ORDER BY name ASC`, [groupOf(dept)]);
        return res.json({ success: true, mentors });
    } catch (err) {
        console.error('Error fetching mentors:', err);
        return res.status(500).json({ error: 'Failed to fetch mentors' });
    }
});

module.exports = router;
