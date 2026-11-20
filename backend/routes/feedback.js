const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');
const { verifyItOps } = require('../middleware/itops');

const router = express.Router();
const STATUSES = ['open', 'investigating', 'resolved'];

// 1. Submit feedback (any signed-in user). Identity comes from the token, not the request body.
router.post('/submit', authenticate, async (req, res) => {
    try {
        const { message, category, rating, device_info } = req.body || {};
        if (!message || !String(message).trim()) {
            return res.status(400).json({ error: 'Please enter a feedback message or issue description.' });
        }

        const [result] = await pool.query(
            `INSERT INTO user_feedbacks
             (user_id, user_name, user_email, user_role, category, message, rating, device_info)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                req.user.name || null,
                req.user.email || null,
                req.user.role || null,
                String(category || 'Issue / Suggestion').slice(0, 100),
                String(message).trim().slice(0, 4000),
                Math.min(5, Math.max(1, parseInt(rating, 10) || 5)),
                String(device_info || 'Unknown device').slice(0, 250)
            ]
        );

        return res.json({
            success: true,
            message: 'Feedback submitted. Thank you for helping improve AttendOTP.',
            feedbackId: result.insertId
        });
    } catch (err) {
        console.error('Error submitting feedback:', err);
        return res.status(500).json({ error: 'Failed to record feedback' });
    }
});

// 2. All feedback (IT Operations console)
router.get('/all', verifyItOps, async (req, res) => {
    try {
        const [feedbacks] = await pool.query('SELECT * FROM user_feedbacks ORDER BY created_at DESC LIMIT 200');
        return res.json({ success: true, count: feedbacks.length, feedbacks });
    } catch (err) {
        console.error('Error fetching feedbacks:', err);
        return res.status(500).json({ error: 'Failed to load feedbacks' });
    }
});

// 3. Update status (IT Operations console)
router.patch('/:id/status', verifyItOps, async (req, res) => {
    try {
        const { status } = req.body || {};
        if (!STATUSES.includes(status)) {
            return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}` });
        }
        await pool.query('UPDATE user_feedbacks SET status = ? WHERE id = ?', [status, req.params.id]);
        return res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        console.error('Error updating status:', err);
        return res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
