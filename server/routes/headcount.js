const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ort = require('onnxruntime-node');
const sharp = require('sharp');
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'headcounts');
const FACE_MODEL_PATH = path.join(__dirname, '..', 'models', 'yolov8m-face.onnx');
const PERSON_MODEL_PATH = path.join(__dirname, '..', 'models', 'yolov8m.onnx');

let faceSession = null;
let personSession = null;

const sessionOptions = {
    executionMode: 'sequential',
    interOpNumThreads: 2,
    intraOpNumThreads: 2
};

const getFaceSession = async () => {
    if (!faceSession && fs.existsSync(FACE_MODEL_PATH)) {
        faceSession = await ort.InferenceSession.create(FACE_MODEL_PATH, sessionOptions);
        console.log('✓ YOLOv8m-Face (103MB Face Model) initialized on Node.js (CPU capped to 2 threads)');
    }
    return faceSession;
};

const getPersonSession = async () => {
    if (!personSession && fs.existsSync(PERSON_MODEL_PATH)) {
        personSession = await ort.InferenceSession.create(PERSON_MODEL_PATH, sessionOptions);
        console.log('✓ YOLOv8m (103MB Person Model) initialized on Node.js (CPU capped to 2 threads)');
    }
    return personSession;
};

// Initialize models immediately with safety catch
getFaceSession().catch(err => console.error('Error loading YOLO Face model:', err));
getPersonSession().catch(err => console.error('Error loading YOLO Person model:', err));

// Helper: Extract NMS & Containment filtered boxes from model output
const extractBoxes = (output, origWidth, origHeight, scale, padX, padY, threshold, isPerson = false) => {
    const candidates = [];
    const classOffset = isPerson ? 4 : 4; // Face uses index 4, Person class 0 uses index 4
    for (let i = 0; i < 8400; i++) {
        const score = output[classOffset * 8400 + i];
        if (score >= threshold) {
            const cx = (output[0 * 8400 + i] - padX) / scale;
            const cy = (output[1 * 8400 + i] - padY) / scale;
            const w = output[2 * 8400 + i] / scale;
            const h = output[3 * 8400 + i] / scale;

            candidates.push({
                x: Math.max(0, Math.round(cx - w / 2)),
                y: Math.max(0, Math.round(cy - h / 2)),
                width: Math.min(origWidth, Math.round(w)),
                height: Math.min(origHeight, Math.round(h)),
                confidence: Number(score.toFixed(2))
            });
        }
    }

    candidates.sort((a, b) => b.confidence - a.confidence);
    const nms = [];
    for (const cand of candidates) {
        let keep = true;
        for (const existing of nms) {
            const x1 = Math.max(cand.x, existing.x);
            const y1 = Math.max(cand.y, existing.y);
            const x2 = Math.min(cand.x + cand.width, existing.x + existing.width);
            const y2 = Math.min(cand.y + cand.height, existing.y + existing.height);
            const interW = Math.max(0, x2 - x1);
            const interH = Math.max(0, y2 - y1);
            const inter = interW * interH;
            if (inter > 0) {
                const a1 = cand.width * cand.height;
                const a2 = existing.width * existing.height;
                const union = a1 + a2 - inter;
                const iou = inter / union;
                const ios = inter / Math.min(a1, a2); // Containment suppression
                if (iou > 0.40 || ios > (isPerson ? 0.60 : 0.65)) {
                    keep = false;
                    break;
                }
            }
        }
        if (keep) nms.push(cand);
    }
    return nms;
};

// High-precision YOLOv8m Dual-Engine Detection for Classroom Headcount
const detectStudentsYOLO = async (buffer, { threshold, mode = 'hybrid' } = {}) => {
    // 1. Check brightness
    const stats = await sharp(buffer).stats();
    const avgBrightness = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;

    // Reject pitch black / privacy shutter closed
    if (avgBrightness < 18) {
        return {
            isDark: true,
            avgBrightness: Number(avgBrightness.toFixed(1)),
            count: 0,
            boxes: [],
            warning: 'Camera image is pitch black or camera privacy shutter is closed. Please check lighting or open shutter.'
        };
    }

    const meta = await sharp(buffer).metadata();
    const origWidth = meta.width || 640;
    const origHeight = meta.height || 480;

    // 2. High-fidelity Letterbox: preserve exact aspect ratio with padding (no stretching/squashing)
    const { data } = await sharp(buffer)
        .resize(640, 640, { fit: 'contain', background: { r: 114, g: 114, b: 114 } })
        .raw()
        .toBuffer({ resolveWithObject: true });

    const scale = Math.min(640 / origWidth, 640 / origHeight);
    const padX = (640 - origWidth * scale) / 2;
    const padY = (640 - origHeight * scale) / 2;

    const floatArr = new Float32Array(3 * 640 * 640);
    const channelSize = 640 * 640;
    for (let i = 0; i < channelSize; i++) {
        floatArr[i] = data[i * 3] / 255.0;                   // R
        floatArr[channelSize + i] = data[i * 3 + 1] / 255.0; // G
        floatArr[channelSize * 2 + i] = data[i * 3 + 2] / 255.0; // B
    }
    const tensor = new ort.Tensor('float32', floatArr, [1, 3, 640, 640]);

    if (mode === 'person') {
        // Full body / posture mode
        const personThresh = threshold !== undefined ? Number(threshold) : 0.30;
        const session = await getPersonSession();
        if (!session) throw new Error('YOLOv8m person model is not available');
        const results = await session.run({ images: tensor });
        const finalBoxes = extractBoxes(results.output0.data, origWidth, origHeight, scale, padX, padY, personThresh, true);

        finalBoxes.sort((a, b) => {
            const diff = Math.abs(a.y - b.y);
            if (diff < 35) return a.x - b.x;
            return a.y - b.y;
        });
        finalBoxes.forEach((b, i) => b.label = `#${i + 1}`);

        return {
            isDark: false,
            avgBrightness: Number(avgBrightness.toFixed(1)),
            count: finalBoxes.length,
            boxes: finalBoxes,
            modelUsed: 'YOLOv8m (Person Mode)'
        };
    } else if (mode === 'face') {
        // Face detection mode
        const faceThresh = threshold !== undefined ? Number(threshold) : 0.18;
        const session = await getFaceSession();
        if (!session) throw new Error('YOLOv8m-Face model is not available');
        const results = await session.run({ images: tensor });
        const finalBoxes = extractBoxes(results.output0.data, origWidth, origHeight, scale, padX, padY, faceThresh, false);

        finalBoxes.sort((a, b) => {
            const diff = Math.abs(a.y - b.y);
            if (diff < 35) return a.x - b.x;
            return a.y - b.y;
        });
        finalBoxes.forEach((b, i) => b.label = `#${i + 1}`);

        return {
            isDark: false,
            avgBrightness: Number(avgBrightness.toFixed(1)),
            count: finalBoxes.length,
            boxes: finalBoxes,
            modelUsed: 'YOLOv8m-Face (Classroom High Precision)'
        };
    } else {
        // ⚡ HYBRID DUAL ENSEMBLE (Face + Head-Down Occlusion Recovery) - DEFAULT
        const faceThresh = threshold !== undefined ? Number(threshold) : 0.18;
        const faceSess = await getFaceSession();
        const personSess = await getPersonSession();
        if (!faceSess) throw new Error('YOLOv8m-Face model is not available');

        // 1. Run Face Model
        const faceResults = await faceSess.run({ images: tensor });
        const faces = extractBoxes(faceResults.output0.data, origWidth, origHeight, scale, padX, padY, faceThresh, false);

        let recovered = [];
        // 2. Run Person Model to recover students looking straight down / head-down
        if (personSess) {
            const personResults = await personSess.run({ images: tensor });
            const persons = extractBoxes(personResults.output0.data, origWidth, origHeight, scale, padX, padY, 0.35, true);

            for (const p of persons) {
                // Check if this person already has a detected face inside or near upper torso
                const hasFace = faces.some(f => {
                    const fcX = f.x + f.width / 2;
                    const fcY = f.y + f.height / 2;
                    return (
                        fcX >= p.x - 10 && fcX <= p.x + p.width + 10 &&
                        fcY >= p.y - 5 && fcY <= p.y + p.height * 0.55
                    );
                });

                if (!hasFace) {
                    // Recover student whose face is turned away or bent down into desk
                    const headHeight = Math.min(p.height, Math.round(p.width * 0.75));
                    recovered.push({
                        x: p.x,
                        y: p.y,
                        width: p.width,
                        height: headHeight,
                        confidence: p.confidence,
                        isRecovered: true
                    });
                }
            }
        }

        const combined = [...faces, ...recovered];
        combined.sort((a, b) => {
            const diff = Math.abs(a.y - b.y);
            if (diff < 35) return a.x - b.x;
            return a.y - b.y;
        });
        combined.forEach((b, i) => b.label = `#${i + 1}`);

        return {
            isDark: false,
            avgBrightness: Number(avgBrightness.toFixed(1)),
            count: combined.length,
            boxes: combined,
            modelUsed: `YOLOv8m Dual-Engine (${faces.length} faces + ${recovered.length} occluded)`
        };
    }
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

        const result = await detectStudentsYOLO(buffer, {
            threshold: threshold !== undefined && threshold !== null ? Number(threshold) : undefined,
            mode: req.body.mode || 'hybrid'
        });
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
