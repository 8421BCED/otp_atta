const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// 1. Student: Submit Leave / OD Application
router.post('/apply', authenticate, authorizeRoles('student'), async (req, res) => {
    try {
        const studentId = req.user.id;
        const {
            type, // 'internal' | 'external'
            eventName,
            category,
            venue,
            fromDate,
            toDate,
            isAllDay,
            fromPeriod,
            toPeriod,
            reason,
            mentorId
        } = req.body;

        if (!eventName || !fromDate || !toDate || !reason) {
            return res.status(400).json({ error: 'Event name, dates, and reason are required.' });
        }

        const [result] = await pool.query(
            `INSERT INTO leave_applications 
             (student_id, type, event_name, category, venue, from_date, to_date, is_all_day, from_period, to_period, reason, mentor_id, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_mentor')`,
            [
                studentId,
                type || 'internal',
                eventName.trim(),
                category || 'Symposium / Hackathon',
                venue ? venue.trim() : (type === 'internal' ? 'FXEC Campus' : 'External College / Venue'),
                fromDate,
                toDate,
                isAllDay !== false ? 1 : 0,
                isAllDay !== false ? 1 : (parseInt(fromPeriod) || 1),
                isAllDay !== false ? 7 : (parseInt(toPeriod) || 7),
                reason.trim(),
                mentorId ? parseInt(mentorId) : null
            ]
        );

        return res.json({
            success: true,
            message: `Leave application for "${eventName}" submitted successfully! It has been routed to your Faculty Mentor for initial review before HOD sanction.`,
            applicationId: result.insertId
        });
    } catch (err) {
        console.error('Error applying for leave:', err);
        return res.status(500).json({ error: 'Failed to submit leave application' });
    }
});

// 2. Student: Get My Leave Applications
router.get('/my-leaves', authenticate, authorizeRoles('student'), async (req, res) => {
    try {
        const studentId = req.user.id;
        const [leaves] = await pool.query(
            `SELECT l.*, 
                    m.name as mentor_name, m.email as mentor_email
             FROM leave_applications l
             LEFT JOIN users m ON l.mentor_id = m.id
             WHERE l.student_id = ?
             ORDER BY l.id DESC`,
            [studentId]
        );

        return res.json({ success: true, leaves });
    } catch (err) {
        console.error('Error fetching student leaves:', err);
        return res.status(500).json({ error: 'Failed to fetch student leaves' });
    }
});

// 3. Faculty / Mentor: Get Applications routed to Mentor (or in same department)
router.get('/mentor-requests', authenticate, authorizeRoles('staff', 'hod'), async (req, res) => {
    try {
        const staffId = req.user.id;
        const dept = req.user.department;

        // Fetch applications where mentor_id is this staff OR in staff's department if mentor not assigned
        const [requests] = await pool.query(
            `SELECT l.*, 
                    u.name as student_name, u.email as student_email, u.roll_number, u.department, u.year_of_study,
                    m.name as mentor_name
             FROM leave_applications l
             JOIN users u ON l.student_id = u.id
             LEFT JOIN users m ON l.mentor_id = m.id
             WHERE (l.mentor_id = ? OR (l.mentor_id IS NULL AND u.department = ?))
             ORDER BY l.id DESC`,
            [staffId, dept]
        );

        return res.json({ success: true, requests });
    } catch (err) {
        console.error('Error fetching mentor leave requests:', err);
        return res.status(500).json({ error: 'Failed to fetch mentor leave requests' });
    }
});

// 4. Faculty / Mentor: Endorse & Forward to HOD (or Reject)
router.post('/mentor-review', authenticate, authorizeRoles('staff', 'hod'), async (req, res) => {
    try {
        const staffId = req.user.id;
        const { applicationId, action, remarks } = req.body; // action: 'forward' | 'reject'

        if (!applicationId || !action) {
            return res.status(400).json({ error: 'Application ID and action are required' });
        }

        const newStatus = action === 'forward' ? 'pending_hod' : 'rejected';

        await pool.query(
            `UPDATE leave_applications 
             SET status = ?, mentor_id = ?, mentor_remarks = ?, mentor_reviewed_at = NOW()
             WHERE id = ?`,
            [newStatus, staffId, remarks || (action === 'forward' ? 'Recommended and forwarded to HOD for approval.' : 'Rejected by mentor.'), applicationId]
        );

        return res.json({
            success: true,
            message: action === 'forward' 
                ? 'Application endorsed and forwarded to Department HOD for final approval!'
                : 'Application rejected.'
        });
    } catch (err) {
        console.error('Error in mentor review:', err);
        return res.status(500).json({ error: 'Failed to process mentor review' });
    }
});

// 5. HOD: Get Pending Leave Requests (Endorsed by Mentor)
router.get('/hod-requests', authenticate, authorizeRoles('hod', 'principal'), async (req, res) => {
    try {
        const dept = req.user.role === 'principal' ? (req.query.department || 'IT') : req.user.department;

        const [requests] = await pool.query(
            `SELECT l.*, 
                    u.name as student_name, u.email as student_email, u.roll_number, u.department, u.year_of_study,
                    m.name as mentor_name, m.email as mentor_email
             FROM leave_applications l
             JOIN users u ON l.student_id = u.id
             LEFT JOIN users m ON l.mentor_id = m.id
             WHERE u.department = ?
             ORDER BY l.id DESC`,
            [dept]
        );

        return res.json({ success: true, requests });
    } catch (err) {
        console.error('Error fetching HOD leave requests:', err);
        return res.status(500).json({ error: 'Failed to fetch HOD leave requests' });
    }
});

// 6. HOD: Final Approve or Reject Leave Application (Approve automatically grants 100% OD attendance credit!)
router.post('/hod-review', authenticate, authorizeRoles('hod', 'principal'), async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { applicationId, action, remarks } = req.body; // action: 'approve' | 'reject'

        if (!applicationId || !action) {
            return res.status(400).json({ error: 'Application ID and action are required' });
        }

        const [appRows] = await conn.query('SELECT * FROM leave_applications WHERE id = ?', [applicationId]);
        if (appRows.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ error: 'Application not found' });
        }

        const leave = appRows[0];
        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        await conn.query(
            `UPDATE leave_applications 
             SET status = ?, hod_remarks = ?, hod_reviewed_at = NOW()
             WHERE id = ?`,
            [newStatus, remarks || (action === 'approve' ? 'Sanctioned by HOD with 100% OD Attendance credit.' : 'Rejected by HOD.'), applicationId]
        );

        // If approved, automatically credit attendance records as 'od' and release any day locks!
        if (action === 'approve') {
            const [periods] = await conn.query('SELECT id, period_number, is_break FROM periods ORDER BY id ASC');
            const [defaultRoom] = await conn.query('SELECT id FROM rooms LIMIT 1');
            const roomId = defaultRoom.length > 0 ? defaultRoom[0].id : 1;

            const targetPeriods = periods.filter(p => {
                if (p.is_break) return false;
                if (leave.is_all_day) return true;
                return p.period_number >= leave.from_period && p.period_number <= leave.to_period;
            });

            const startDate = new Date(leave.from_date);
            const endDate = new Date(leave.to_date);

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const curDateStr = d.toISOString().slice(0, 10);

                // Release day lock
                await conn.query(`
                    INSERT INTO student_day_locks (student_id, date, first_otp_at, is_locked_out, reason)
                    VALUES (?, ?, NOW(), 0, 'HOD_UNLOCKED')
                    ON DUPLICATE KEY UPDATE is_locked_out = 0, reason = 'HOD_UNLOCKED'
                `, [leave.student_id, curDateStr]);

                // Insert OD attendance records for target periods
                for (const p of targetPeriods) {
                    await conn.query(`
                        INSERT INTO attendance_records 
                        (student_id, period_id, room_id, staff_id, date, status, otp_used)
                        VALUES (?, ?, ?, ?, ?, 'od', 'HOD_LEAVE_APPROVED')
                        ON DUPLICATE KEY UPDATE status = 'od', otp_used = 'HOD_LEAVE_APPROVED'
                    `, [leave.student_id, p.id, roomId, req.user.id, curDateStr]);
                }
            }
        }

        await conn.commit();
        conn.release();

        return res.json({
            success: true,
            message: action === 'approve'
                ? `Leave application approved! Student has been granted On-Duty attendance credit.`
                : 'Leave application rejected.'
        });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('Error in HOD review:', err);
        return res.status(500).json({ error: 'Failed to process HOD review' });
    }
});

// 7. Get Available Mentors for Student Department
router.get('/mentors', authenticate, async (req, res) => {
    try {
        const dept = req.user.department || 'IT';
        const [mentors] = await pool.query(
            `SELECT id, name, email, department, designation 
             FROM users 
             WHERE role IN ('staff', 'hod') AND department = ?
             ORDER BY name ASC`,
            [dept]
        );
        return res.json({ success: true, mentors });
    } catch (err) {
        console.error('Error fetching mentors:', err);
        return res.status(500).json({ error: 'Failed to fetch mentors' });
    }
});

module.exports = router;
