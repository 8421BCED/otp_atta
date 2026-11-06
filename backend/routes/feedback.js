const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

// 1. Submit User Feedback / Bug Report (Anyone logged in, or anonymous fallback)
router.post('/submit', async (req, res) => {
    try {
        const { message, category, rating, user_name, user_email, user_role, user_id, device_info } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Please enter a feedback message or issue description.' });
        }

        const [result] = await pool.query(
            `INSERT INTO user_feedbacks 
             (user_id, user_name, user_email, user_role, category, message, rating, device_info)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id || null,
                user_name || 'Anonymous User',
                user_email || 'anonymous@francisxavier.ac.in',
                user_role || 'student',
                category || 'Issue / Suggestion',
                message.trim(),
                parseInt(rating, 10) || 5,
                device_info || 'Unknown Device'
            ]
        );

        return res.json({
            success: true,
            message: 'Feedback submitted successfully. Thank you for helping us improve AttendOTP!',
            feedbackId: result.insertId
        });
    } catch (err) {
        console.error('Error submitting feedback:', err);
        return res.status(500).json({ error: 'Failed to record feedback' });
    }
});

// 2. View All Feedbacks (Used by IT Ops Master Console /strange)
router.get('/all', async (req, res) => {
    try {
        const [feedbacks] = await pool.query(`
            SELECT * FROM user_feedbacks 
            ORDER BY created_at DESC 
            LIMIT 100
        `);

        return res.json({
            success: true,
            count: feedbacks.length,
            feedbacks
        });
    } catch (err) {
        console.error('Error fetching feedbacks:', err);
        return res.status(500).json({ error: 'Failed to load feedbacks' });
    }
});

// 3. Update Feedback Status (Resolve / Acknowledge)
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'open' | 'investigating' | 'resolved'

        await pool.query('UPDATE user_feedbacks SET status = ? WHERE id = ?', [status, id]);
        return res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        console.error('Error updating status:', err);
        return res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;

