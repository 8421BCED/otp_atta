const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const COLLEGE_DOMAIN = '@francisxavier.ac.in';

// Helper to generate JWT
const generateToken = (user, deviceId) => {
    return jwt.sign(
        {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            roll_number: user.roll_number,
            deviceId: deviceId || null
        },
        process.env.JWT_SECRET || 'fxec_secret_key_2026',
        { expiresIn: '7d' }
    );
};

// 1. User Login
router.post('/login', async (req, res) => {
    try {
        const { email, password, deviceInfo } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail.endsWith(COLLEGE_DOMAIN)) {
            return res.status(400).json({ 
                error: `Access restricted. Please use your official college email ending with ${COLLEGE_DOMAIN}` 
            });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account has been deactivated. Please contact administrator.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Device Binding for Anti-Proxy (Specifically for Students)
        let deviceStatus = 'unbound';
        if (user.role === 'student' && deviceInfo && deviceInfo.deviceId) {
            const [locks] = await pool.query('SELECT * FROM device_locks WHERE user_id = ?', [user.id]);

            if (locks.length === 0) {
                // First-time login: bind device permanently
                await pool.query(
                    `INSERT INTO device_locks 
                    (user_id, device_id, device_fingerprint, device_name, platform, user_agent, screen_resolution, ip_address, is_locked)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                    [
                        user.id,
                        deviceInfo.deviceId,
                        deviceInfo.fingerprint || deviceInfo.deviceId,
                        deviceInfo.deviceName || 'Primary Mobile Device',
                        deviceInfo.platform || 'Browser',
                        req.headers['user-agent'] || '',
                        deviceInfo.screenResolution || '',
                        req.ip || ''
                    ]
                );
                deviceStatus = 'bound_now';
            } else {
                const lock = locks[0];
                if (lock.is_locked && lock.device_id !== deviceInfo.deviceId) {
                    return res.status(403).json({
                        code: 'DEVICE_LOCKED',
                        error: 'Device Mismatch / Anti-Proxy Lockout',
                        message: `This account is locked to your registered device: "${lock.device_name}". Attempting to log in from a friend's phone or secondary device is prohibited. Contact your HOD to request a device lock reset.`,
                        registeredDevice: lock.device_name,
                        lockedAt: lock.locked_at
                    });
                }
                // Update last verification
                await pool.query('UPDATE device_locks SET last_verified_at = NOW() WHERE user_id = ?', [user.id]);
                deviceStatus = 'verified';
            }
        }

        const token = generateToken(user, deviceInfo ? deviceInfo.deviceId : null);

        delete user.password_hash;
        return res.json({
            message: 'Login successful',
            token,
            user,
            deviceStatus
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error during login' });
    }
});

// 2. Demo Instant Login (For seamless pairing / testing all 4 roles)
router.post('/demo-login', async (req, res) => {
    try {
        const { role, email, deviceInfo } = req.body;

        let query = 'SELECT * FROM users WHERE ';
        let params = [];

        if (email) {
            query += 'email = ?';
            params.push(email);
        } else if (role) {
            query += 'role = ? LIMIT 1';
            params.push(role);
        } else {
            return res.status(400).json({ error: 'Role or email required for demo login' });
        }

        const [users] = await pool.query(query, params);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Demo user not found' });
        }

        const user = users[0];
        const deviceId = deviceInfo ? deviceInfo.deviceId : 'DEMO_DEVICE_001';

        // Auto-handle device lock for demo student
        if (user.role === 'student' && deviceInfo && deviceInfo.deviceId) {
            const [locks] = await pool.query('SELECT * FROM device_locks WHERE user_id = ?', [user.id]);
            if (locks.length === 0) {
                await pool.query(
                    `INSERT INTO device_locks (user_id, device_id, device_fingerprint, device_name, is_locked)
                     VALUES (?, ?, ?, ?, 1)`,
                    [user.id, deviceInfo.deviceId, deviceInfo.fingerprint || 'demo_hash', deviceInfo.deviceName || 'Personal Phone']
                );
            }
        }

        const token = generateToken(user, deviceId);
        delete user.password_hash;

        return res.json({
            message: `Switched to demo role: ${user.role.toUpperCase()}`,
            token,
            user
        });
    } catch (err) {
        console.error('Demo login error:', err);
        return res.status(500).json({ error: 'Error during demo login' });
    }
});

// 3. User Registration
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, department, roll_number, year_of_study, deviceInfo } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Name, email, password, and role are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail.endsWith(COLLEGE_DOMAIN)) {
            return res.status(400).json({ 
                error: `Registration requires official college email ending with ${COLLEGE_DOMAIN}` 
            });
        }

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered. Please log in.' });
        }

        const hash = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, department, roll_number, year_of_study) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, normalizedEmail, hash, role, department || 'IT', roll_number || null, year_of_study || null]
        );

        const newUserId = result.insertId;

        if (role === 'student' && deviceInfo && deviceInfo.deviceId) {
            await pool.query(
                `INSERT INTO device_locks 
                (user_id, device_id, device_fingerprint, device_name, platform, user_agent, screen_resolution, ip_address, is_locked)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [
                    newUserId,
                    deviceInfo.deviceId,
                    deviceInfo.fingerprint || deviceInfo.deviceId,
                    deviceInfo.deviceName || 'Registered Mobile Device',
                    deviceInfo.platform || 'Browser',
                    req.headers['user-agent'] || '',
                    deviceInfo.screenResolution || '',
                    req.ip || ''
                ]
            );
        }

        const newUser = {
            id: newUserId,
            name,
            email: normalizedEmail,
            role,
            department: department || 'IT',
            roll_number
        };

        const token = generateToken(newUser, deviceInfo ? deviceInfo.deviceId : null);

        return res.status(201).json({
            message: 'Registration successful',
            token,
            user: newUser
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ error: 'Error registering user' });
    }
});

// 4. Current user endpoint
router.get('/me', authenticate, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, email, role, department, roll_number, year_of_study, is_active FROM users WHERE id = ?',
            [req.user.id]
        );
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        let deviceLock = null;
        if (user.role === 'student') {
            const [locks] = await pool.query('SELECT * FROM device_locks WHERE user_id = ?', [user.id]);
            if (locks.length > 0) {
                deviceLock = locks[0];
            }
        }

        return res.json({ user, deviceLock });
    } catch (err) {
        console.error('Get me error:', err);
        return res.status(500).json({ error: 'Error fetching profile' });
    }
});

module.exports = router;
