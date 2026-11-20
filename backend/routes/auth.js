const express = require('express');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db');
const { authenticate, signUserToken } = require('../middleware/auth');
const { isDeviceLockExempt } = require('../deviceLockExempt');
const { googleClientId, collegeDomain, passwordLogin } = require('../config');

const router = express.Router();
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

// Used to keep response time similar whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 10);

const FP_RE = /^v2:[a-f0-9]{64}$/;

const publicUser = (u) => {
    const { password_hash, ...rest } = u;
    return rest;
};

// Students are bound to the device they first sign in from. The device is recognised by traits that
// do not change on the same phone (screen size, GPU, platform, touch support), not by anything stored
// in the browser, so copying browser data to a friend's phone does not carry the binding across.
// Returns { blocked } to reject the request, or { device } to continue.
const enforceDeviceBinding = async (user, deviceInfo, req) => {
    if (user.role !== 'student' || isDeviceLockExempt(user.email)) return { device: null };

    const fingerprint = deviceInfo && deviceInfo.fingerprint;
    if (typeof fingerprint !== 'string' || !FP_RE.test(fingerprint)) {
        return {
            blocked: {
                status: 400,
                body: {
                    code: 'DEVICE_REQUIRED',
                    error: 'Device could not be identified',
                    message: 'Your device could not be identified. Reload the page and try again.'
                }
            }
        };
    }

    await pool.query(
        `INSERT IGNORE INTO device_locks
         (user_id, device_id, device_fingerprint, device_name, platform, user_agent, screen_resolution, ip_address, is_locked)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
            user.id,
            String(deviceInfo.deviceId || '').slice(0, 250),
            fingerprint,
            String(deviceInfo.deviceName || 'Registered device').slice(0, 150),
            String(deviceInfo.platform || 'Browser').slice(0, 100),
            req.headers['user-agent'] || '',
            String(deviceInfo.screenResolution || '').slice(0, 50),
            req.ip || ''
        ]
    );

    const [locks] = await pool.query('SELECT * FROM device_locks WHERE user_id = ?', [user.id]);
    const lock = locks[0];

    if (lock && lock.is_locked) {
        let ok;
        if (String(lock.device_fingerprint).startsWith('v2:')) {
            ok = lock.device_fingerprint === fingerprint;
        } else {
            // Older binding made before fingerprints were stable: accept the old device id once, then upgrade it.
            ok = lock.device_id === deviceInfo.deviceId;
            if (ok) await pool.query('UPDATE device_locks SET device_fingerprint = ? WHERE user_id = ?', [fingerprint, user.id]);
        }

        if (!ok) {
            return {
                blocked: {
                    status: 403,
                    body: {
                        code: 'DEVICE_LOCKED',
                        error: 'This account is registered to another device',
                        message: `This account is registered to "${lock.device_name}". Sign in from that device, or ask your HOD to reset the device binding.`,
                        registeredDevice: lock.device_name,
                        lockedAt: lock.locked_at
                    }
                }
            };
        }
    }

    await pool.query('UPDATE device_locks SET last_verified_at = NOW(), device_id = ? WHERE user_id = ?', [String(deviceInfo.deviceId || '').slice(0, 250), user.id]);
    return { device: { fingerprint, deviceId: String(deviceInfo.deviceId || '').slice(0, 250) } };
};

const finishLogin = async (user, deviceInfo, req, res, message) => {
    const result = await enforceDeviceBinding(user, deviceInfo, req);
    if (result.blocked) return res.status(result.blocked.status).json(result.blocked.body);
    return res.json({ message, token: signUserToken(user, result.device), user: publicUser(user) });
};

// 0. What the sign-in screen should offer
router.get('/config', (req, res) => {
    res.json({ passwordLogin, google: !!googleClient, googleClientId: googleClientId || null, collegeDomain });
});

// 1. Email and password. Off unless PASSWORD_LOGIN=true. Google is the normal way in.
router.post('/login', async (req, res) => {
    try {
        if (!passwordLogin) {
            return res.status(403).json({ error: 'Password sign-in is turned off', message: 'Use "Continue with Google" with your college account.' });
        }
        const { email, password, deviceInfo } = req.body || {};
        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail.endsWith(collegeDomain)) {
            return res.status(400).json({ error: `Use your official college email ending with ${collegeDomain}` });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
        const user = users[0];

        const hash = user && user.password_hash && user.password_hash.startsWith('$2') ? user.password_hash : DUMMY_HASH;
        const passwordOk = await bcrypt.compare(password, hash);

        if (!user || !passwordOk) {
            const googleOnly = user && user.password_hash === 'GOOGLE_SSO';
            return res.status(401).json({ error: googleOnly ? 'This account uses Google sign-in' : 'Invalid email or password' });
        }
        if (!user.is_active) {
            return res.status(403).json({ error: 'This account has been deactivated. Contact the administrator.' });
        }
        return finishLogin(user, deviceInfo, req, res, 'Login successful');
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error during login' });
    }
});

// 2. Google sign-in. The ID token is verified against Google's keys and our client id.
router.post('/google', async (req, res) => {
    try {
        const { credential, deviceInfo } = req.body || {};
        if (!googleClient) return res.status(503).json({ error: 'Google sign-in is not configured on this server' });
        if (!credential || typeof credential !== 'string') {
            return res.status(400).json({ error: 'Google credential is required' });
        }

        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
            payload = ticket.getPayload();
        } catch (e) {
            return res.status(401).json({ error: 'Google sign-in could not be verified' });
        }

        const email = (payload.email || '').toLowerCase();
        if (!payload.email_verified || !email.endsWith(collegeDomain)) {
            return res.status(403).json({ error: `Only official ${collegeDomain} accounts are allowed` });
        }

        // Accounts are created by the administrator. No automatic sign-up.
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];
        if (!user) {
            return res.status(403).json({
                error: 'No account found for this email',
                message: 'Your college email is not registered yet. Contact your department office.'
            });
        }
        if (!user.is_active) {
            return res.status(403).json({ error: 'This account has been deactivated. Contact the administrator.' });
        }
        return finishLogin(user, deviceInfo, req, res, 'Google sign-in successful');
    } catch (err) {
        console.error('Google SSO error:', err);
        return res.status(500).json({ error: 'Internal server error during Google sign-in' });
    }
});

// 3. Change own password (only meaningful for accounts that have one)
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword || String(newPassword).length < 8) {
            return res.status(400).json({ error: 'Current password and a new password of at least 8 characters are required' });
        }
        const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
        if (!rows[0] || !String(rows[0].password_hash).startsWith('$2') || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(newPassword, 10), req.user.id]);
        return res.json({ success: true, message: 'Password updated' });
    } catch (err) {
        console.error('Change password error:', err);
        return res.status(500).json({ error: 'Could not update password' });
    }
});

// 4. Current user. The app calls this on start so it never trusts what the browser saved.
router.get('/me', authenticate, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, email, role, department, roll_number, year_of_study, is_active FROM users WHERE id = ?',
            [req.user.id]
        );
        if (users.length === 0 || !users[0].is_active) {
            return res.status(401).json({ error: 'Account not available' });
        }
        const user = users[0];
        let deviceLock = null;
        if (user.role === 'student') {
            const [locks] = await pool.query('SELECT device_name, platform, locked_at, last_verified_at FROM device_locks WHERE user_id = ?', [user.id]);
            deviceLock = locks[0] || null;
        }
        return res.json({ user, deviceLock });
    } catch (err) {
        console.error('Get me error:', err);
        return res.status(500).json({ error: 'Error fetching profile' });
    }
});

module.exports = router;

