const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'headcounts');

// Helper to clean up expired audit files (> 1 hour old)
const cleanupExpiredFiles = async () => {
    try {
        // 1. Fetch expired records
        const [expired] = await pool.query(
            'SELECT id, image_url FROM classroom_headcounts WHERE expires_at < NOW()'
        );

        for (const row of expired) {
            if (row.image_url) {
                const filename = path.basename(row.image_url);
                const filePath = path.join(UPLOADS_DIR, filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        }

        // 2. Delete expired records from DB
        if (expired.length > 0) {
            await pool.query('DELETE FROM classroom_headcounts WHERE expires_at < NOW()');
        }

        // 3. Fallback: check file timestamps in directory
        if (fs.existsSync(UPLOADS_DIR)) {
            const files = fs.readdirSync(UPLOADS_DIR);
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            for (const file of files) {
                const fp = path.join(UPLOADS_DIR, file);
                try {
                    const stats = fs.statSync(fp);
                    if (stats.mtimeMs < oneHourAgo) {
                        fs.unlinkSync(fp);
                    }
                } catch (e) {}
            }
        }
    } catch (err) {
        console.error('Headcount cleanup error:', err);
    }
};

// 1. Save new AI Headcount Audit Snapshot
router.post('/audit', authenticate, authorizeRoles('staff', 'hod', 'principal'), async (req, res) => {
    try {
        const { roomId, periodId, otpCount, visualCount, imageData, boxes } = req.body;
        const staffId = req.user.id;

        if (!roomId || !imageData) {
            return res.status(400).json({ error: 'Room ID and image data are required' });
        }

        // Save image to disk
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        const filename = `audit_room_${roomId}_${Date.now()}.jpg`;
        const filePath = path.join(UPLOADS_DIR, filename);

        // Strip data:image/jpeg;base64, header if present
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, buffer);

        const imageUrl = `/uploads/headcounts/${filename}`;
        const matchStatus = Number(visualCount) >= Number(otpCount) - 2 ? 'verified' : 'discrepancy';

        // Insert into DB with 1-hour expiration
        const [result] = await pool.query(
            `INSERT INTO classroom_headcounts 
             (room_id, staff_id, period_id, otp_count, visual_count, image_url, boxes_json, match_status, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
            [
                roomId,
                staffId,
                periodId || 1,
                otpCount || 0,
                visualCount || 0,
                imageUrl,
                JSON.stringify(boxes || []),
                matchStatus
            ]
        );

        // Trigger asynchronous cleanup of any expired snapshots
        cleanupExpiredFiles().catch(() => {});

        return res.json({
            success: true,
            auditId: result.insertId,
            imageUrl,
            visualCount,
            otpCount,
            matchStatus,
            message: matchStatus === 'verified' 
                ? 'Headcount Match Verified (Attendance Fidelity 100%)' 
                : 'Discrepancy Detected: Audit photo contains fewer students than OTP submissions.'
        });
    } catch (err) {
        console.error('Error saving headcount audit:', err);
        return res.status(500).json({ error: 'Failed to record AI headcount audit' });
    }
});

// 2. Fetch Latest Valid Audit for Room (within 1 hour)
router.get('/latest/:roomId', authenticate, async (req, res) => {
    try {
        const { roomId } = req.params;
        const [audits] = await pool.query(
            `SELECT ch.*, u.name as staff_name, r.room_number 
             FROM classroom_headcounts ch
             JOIN users u ON ch.staff_id = u.id
             JOIN rooms r ON ch.room_id = r.id
             WHERE ch.room_id = ? AND ch.expires_at >= NOW()
             ORDER BY ch.id DESC LIMIT 1`,
            [roomId]
        );

        if (audits.length === 0) {
            return res.json({ hasAudit: false });
        }

        const audit = audits[0];
        try {
            if (typeof audit.boxes_json === 'string') {
                audit.boxes_json = JSON.parse(audit.boxes_json);
            }
        } catch (e) {}

        return res.json({
            hasAudit: true,
            audit
        });
    } catch (err) {
        console.error('Error fetching latest headcount:', err);
        return res.status(500).json({ error: 'Failed to fetch latest headcount audit' });
    }
});

// 3. Clear / Retake Audit
router.delete('/:id', authenticate, authorizeRoles('staff', 'hod'), async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT image_url FROM classroom_headcounts WHERE id = ?', [id]);
        if (rows.length > 0 && rows[0].image_url) {
            const fp = path.join(UPLOADS_DIR, path.basename(rows[0].image_url));
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        await pool.query('DELETE FROM classroom_headcounts WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Audit cleared. Ready to retake.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to clear audit' });
    }
});

module.exports = router;
