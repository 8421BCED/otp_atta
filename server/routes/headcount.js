const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ort = require('onnxruntime-node');
const sharp = require('sharp');
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'headcounts');
const MODEL_PATH = path.join(__dirname, '..', 'models', 'yolov8n.onnx');

let yoloSession = null;
const getYoloSession = async () => {
    if (!yoloSession) {
        if (fs.existsSync(MODEL_PATH)) {
            yoloSession = await ort.InferenceSession.create(MODEL_PATH);
            console.log('✓ YOLOv8n ONNX model initialized successfully on Node.js');
        } else {
            console.warn('⚠️ YOLO model not found at:', MODEL_PATH);
        }
    }
    return yoloSession;
};

// Immediately initialize session
getYoloSession().catch(err => console.error('Error loading YOLO model:', err));

// High-speed YOLOv8 Detection Function for Student Headcount
const detectStudentsYOLO = async (buffer, threshold = 0.25) => {
    // 1. Check brightness using sharp
    const stats = await sharp(buffer).stats();
    const avgBrightness = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;

    // Pitch black or webcam privacy shutter closed (< 18 brightness)
    if (avgBrightness < 18) {
        return {
            isDark: true,
            avgBrightness: Number(avgBrightness.toFixed(1)),
            count: 0,
            boxes: [],
            warning: 'Camera image is pitch black or camera privacy shutter is closed. Please check lighting and camera.'
        };
    }

    const session = await getYoloSession();
    if (!session) {
        throw new Error('YOLOv8 model is not ready');
    }

    const meta = await sharp(buffer).metadata();
    const origWidth = meta.width || 640;
    const origHeight = meta.height || 480;

    // 2. Preprocess: resize to 640x640 RGB float32
    const { data } = await sharp(buffer)
        .resize(640, 640, { fit: 'fill' })
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Format: [1, 3, 640, 640] NCHW float32 normalized 0..1
    const floatArr = new Float32Array(3 * 640 * 640);
    const channelSize = 640 * 640;
    for (let i = 0; i < channelSize; i++) {
        floatArr[i] = data[i * 3] / 255.0;                   // R
        floatArr[channelSize + i] = data[i * 3 + 1] / 255.0; // G
        floatArr[channelSize * 2 + i] = data[i * 3 + 2] / 255.0; // B
    }

    const tensor = new ort.Tensor('float32', floatArr, [1, 3, 640, 640]);
    const results = await session.run({ images: tensor });
    const output = results[session.outputNames[0]].data; // Float32Array of 84 * 8400 elements

    const scaleX = origWidth / 640;
    const scaleY = origHeight / 640;

    const rawCandidates = [];
    const numAnchors = 8400;

    for (let i = 0; i < numAnchors; i++) {
        const personScore = output[4 * numAnchors + i]; // Class 0: 'person'
        if (personScore >= threshold) {
            const cx = output[0 * numAnchors + i];
            const cy = output[1 * numAnchors + i];
            const w = output[2 * numAnchors + i];
            const h = output[3 * numAnchors + i];

            const origX = (cx - w / 2) * scaleX;
            const origY = (cy - h / 2) * scaleY;
            const origW = w * scaleX;
            const origH = h * scaleY;

            rawCandidates.push({
                x: Math.max(0, Math.round(origX)),
                y: Math.max(0, Math.round(origY)),
                width: Math.min(origWidth, Math.round(origW)),
                height: Math.min(origHeight, Math.round(origH)),
                confidence: Number(personScore.toFixed(2))
            });
        }
    }

    // Sort descending by confidence
    rawCandidates.sort((a, b) => b.confidence - a.confidence);

    // Non-Maximum Suppression (NMS)
    const finalBoxes = [];
    const iouThreshold = 0.42;

    const calculateIoU = (b1, b2) => {
        const x1 = Math.max(b1.x, b2.x);
        const y1 = Math.max(b1.y, b2.y);
        const x2 = Math.min(b1.x + b1.width, b2.x + b2.width);
        const y2 = Math.min(b1.y + b1.height, b2.y + b2.height);

        const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const a1 = b1.width * b1.height;
        const a2 = b2.width * b2.height;
        const union = a1 + a2 - inter;
        return union > 0 ? inter / union : 0;
    };

    for (const cand of rawCandidates) {
        let keep = true;
        for (const existing of finalBoxes) {
            if (calculateIoU(cand, existing) > iouThreshold) {
                keep = false;
                break;
            }
        }
        if (keep) {
            finalBoxes.push(cand);
        }
    }

    // Sort row by row (top-to-bottom, left-to-right) for neat student numbering
    finalBoxes.sort((a, b) => {
        const rowDiff = Math.abs(a.y - b.y);
        if (rowDiff < 35) return a.x - b.x;
        return a.y - b.y;
    });

    finalBoxes.forEach((b, i) => {
        b.label = `#${i + 1}`;
    });

    return {
        isDark: false,
        avgBrightness: Number(avgBrightness.toFixed(1)),
        count: finalBoxes.length,
        boxes: finalBoxes
    };
};

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

// 4. Run Real AI YOLOv8n Detection on Camera / Uploaded Frame
router.post('/detect', authenticate, async (req, res) => {
    try {
        const { imageData, threshold } = req.body;
        if (!imageData) {
            return res.status(400).json({ error: 'Image data is required for detection' });
        }

        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const result = await detectStudentsYOLO(buffer, threshold ? Number(threshold) : 0.25);
        return res.json({
            success: true,
            ...result
        });
    } catch (err) {
        console.error('YOLO detection route error:', err);
        return res.status(500).json({ error: 'YOLO detection processing failed: ' + err.message });
    }
});

module.exports = router;
