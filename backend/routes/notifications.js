const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pool = require('../db');

let adminApp = null;
let messagingService = null;

// Initialize Firebase Admin with Service Account (if present) or Project ID
try {
    const { initializeApp, cert, getApps } = require('firebase-admin/app');
    const { getMessaging } = require('firebase-admin/messaging');

    // Look for serviceAccountKey.json in common paths
    const possibleKeyPaths = [
        path.resolve(process.cwd(), 'serviceAccountKey.json'),
        path.resolve(__dirname, '../serviceAccountKey.json'),
        path.resolve(__dirname, '../../serviceAccountKey.json'),
        path.resolve(__dirname, '../../plans/serviceAccountKey.json')
    ];

    let serviceAccountPath = possibleKeyPaths.find(p => fs.existsSync(p));

    if (getApps().length === 0) {
        if (serviceAccountPath) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            adminApp = initializeApp({
                credential: cert(serviceAccount),
                projectId: serviceAccount.project_id || 'otpatt-da2b6'
            });
            console.log('✓ Firebase Admin initialized with Service Account from:', serviceAccountPath);
        } else {
            adminApp = initializeApp({
                projectId: 'otpatt-da2b6'
            });
            console.log('Firebase Admin initialized with Project ID (serviceAccountKey.json can be added to root for full cloud dispatch).');
        }
    } else {
        adminApp = getApps()[0];
    }

    if (adminApp) {
        messagingService = getMessaging(adminApp);
    }
} catch (e) {
    console.warn('Firebase Admin initialization notice:', e.message);
}

// 1. Register or update FCM Token from client device
router.post('/register-token', async (req, res) => {
    try {
        const { token, userId, role, department, deviceInfo } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'FCM Token is required' });
        }

        await pool.query(
            `INSERT INTO fcm_tokens (user_id, role, department, token, device_info)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                user_id = VALUES(user_id), 
                role = VALUES(role), 
                department = VALUES(department), 
                device_info = VALUES(device_info),
                updated_at = NOW()`,
            [userId || null, role || null, department || null, token, deviceInfo || null]
        );

        console.log(`✓ FCM Token registered for User ${userId || 'guest'} (${role || 'student'})`);
        return res.json({ success: true, message: 'FCM Token registered successfully' });
    } catch (err) {
        console.error('Error saving FCM Token:', err);
        return res.status(500).json({ error: 'Failed to save token' });
    }
});

// 2. Doorbell Dispatch Helper (High-Priority background wake up)
async function sendDoorbellNotification({ title, body, tag, url, targetUserId, targetRole }) {
    try {
        let query = 'SELECT token FROM fcm_tokens WHERE 1=1';
        let params = [];

        if (targetUserId) {
            query += ' AND user_id = ?';
            params.push(targetUserId);
        } else if (targetRole) {
            query += ' AND role = ?';
            params.push(targetRole);
        }

        const [rows] = await pool.query(query, params);
        if (rows.length === 0) {
            console.log('No registered FCM tokens found for target.');
            return { sent: 0, count: 0, reason: 'No devices registered in fcm_tokens table' };
        }

        const tokens = rows.map(r => r.token);

        if (!messagingService) {
            console.warn('Messaging service not ready. (Place serviceAccountKey.json in project root)');
            return { sent: 0, count: tokens.length, note: 'Service Account needed' };
        }

        // Multicast payload configured with Android high priority (Doorbell concept)
        const messagePayload = {
            tokens: tokens,
            notification: {
                title,
                body
            },
            data: {
                title,
                body,
                tag: tag || 'attend-otp-doorbell',
                url: url || '/'
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    priority: 'high',
                    channelId: 'fxec_attend_doorbell',
                    visibility: 'public'
                }
            },
            webpush: {
                headers: {
                    Urgency: 'high'
                },
                notification: {
                    requireInteraction: true,
                    vibrate: [200, 100, 200, 100, 300],
                    icon: '/icon-192.png'
                }
            }
        };

        const response = await messagingService.sendEachForMulticast(messagePayload);
        console.log(`✓ Doorbell Push dispatched: ${response.successCount} successful, ${response.failureCount} failed.`);

        // Automatically clean up stale or uninstalled tokens
        if (response.failureCount > 0) {
            const staleTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success && resp.error && (resp.error.code === 'messaging/registration-token-not-registered' || resp.error.code === 'messaging/invalid-registration-token')) {
                    staleTokens.push(tokens[idx]);
                }
            });
            if (staleTokens.length > 0) {
                await pool.query('DELETE FROM fcm_tokens WHERE token IN (?)', [staleTokens]);
                console.log(`✓ Cleaned up ${staleTokens.length} stale/uninstalled FCM token(s).`);
            }
        }

        return { 
            sent: response.successCount, 
            failed: response.failureCount,
            responses: response.responses.map(r => ({ success: r.success, error: r.error ? r.error.code : null }))
        };
    } catch (err) {
        console.error('Doorbell push error:', err);
        return { error: err.message };
    }
}

// 3. Admin / Trigger Dispatch Endpoint (For testing & automated alerts)
router.post('/dispatch', async (req, res) => {
    try {
        const { title, body, tag, url, targetUserId, targetRole } = req.body;
        if (!title || !body) {
            return res.status(400).json({ error: 'Title and body are required' });
        }

        const result = await sendDoorbellNotification({ title, body, tag, url, targetUserId, targetRole });
        return res.json({ success: true, result });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// 4. Endpoint to fetch registered devices count
router.get('/devices', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, user_id, role, department, device_info, updated_at FROM fcm_tokens');
        return res.json({ count: rows.length, devices: rows });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = {
    router,
    sendDoorbellNotification
};
