const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { verifyItOps, checkPassphrase, signItOpsToken } = require('../middleware/itops');
const { invalidateAccount } = require('../middleware/auth');
const { collegeDomain } = require('../config');

const router = express.Router();

const ROLES = ['student', 'staff', 'hod', 'principal', 'pt'];

const verifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many attempts. Try again later.' }
});

// 1. Exchange the passphrase for a short-lived console token
router.post('/verify', verifyLimiter, (req, res) => {
    const { pass } = req.body || {};
    if (checkPassphrase(pass)) {
        return res.json({ success: true, token: signItOpsToken(), message: 'IT Operations console unlocked' });
    }
    return res.status(401).json({ success: false, error: 'Incorrect passphrase' });
});

// 2. Stats
router.get('/stats', verifyItOps, async (req, res) => {
    try {
        const [counts] = await pool.query(`
            SELECT
                SUM(CASE WHEN role = 'staff' AND is_active = 1 THEN 1 ELSE 0 END) as staffCount,
                SUM(CASE WHEN role = 'hod' AND is_active = 1 THEN 1 ELSE 0 END) as hodCount,
                SUM(CASE WHEN role = 'principal' AND is_active = 1 THEN 1 ELSE 0 END) as principalCount,
                SUM(CASE WHEN role = 'pt' AND is_active = 1 THEN 1 ELSE 0 END) as ptCount,
                SUM(CASE WHEN role = 'student' AND is_active = 1 THEN 1 ELSE 0 END) as studentCount,
                SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactiveCount,
                COUNT(*) as totalUsers
            FROM users
        `);
        const [depts] = await pool.query(`
            SELECT department, COUNT(*) as count
            FROM users
            WHERE role IN ('staff', 'hod', 'pt') AND is_active = 1
            GROUP BY department
            ORDER BY count DESC
        `);
        return res.json({ stats: counts[0], departments: depts });
    } catch (err) {
        console.error('Error in it-ops stats:', err);
        return res.status(500).json({ error: 'Failed to fetch IT Ops stats' });
    }
});

// 3. List users
router.get('/users', verifyItOps, async (req, res) => {
    try {
        const { q, role, department, status } = req.query;
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 200));

        let query = 'SELECT id, name, email, role, department, designation, roll_number, year_of_study, phone, is_active, created_at FROM users WHERE 1=1';
        const params = [];

        if (q && q.trim()) {
            const search = `%${q.trim()}%`;
            query += ' AND (name LIKE ? OR email LIKE ? OR designation LIKE ?)';
            params.push(search, search, search);
        }
        if (role && role !== 'all') { query += ' AND role = ?'; params.push(role); }
        if (department && department !== 'all') { query += ' AND department = ?'; params.push(department); }
        if (status === 'active') query += ' AND is_active = 1';
        else if (status === 'inactive') query += ' AND is_active = 0';

        query += ' ORDER BY role = "principal" DESC, role = "hod" DESC, department ASC, name ASC LIMIT ?';
        params.push(limit);

        const [users] = await pool.query(query, params);
        return res.json({ users, total: users.length });
    } catch (err) {
        console.error('Error fetching users in it-ops:', err);
        return res.status(500).json({ error: 'Failed to fetch users list' });
    }
});

// 4. Create user
router.post('/users', verifyItOps, async (req, res) => {
    try {
        const { name, email, role = 'staff', department = 'IT', designation = '', phone = '' } = req.body || {};
        if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
        if (!ROLES.includes(role)) return res.status(400).json({ error: `Role must be one of: ${ROLES.join(', ')}` });

        const cleanEmail = String(email).trim().toLowerCase();
        if (!cleanEmail.endsWith(collegeDomain)) {
            return res.status(400).json({ error: `The email must end with ${collegeDomain}, because people sign in with their college Google account.` });
        }
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if (existing.length > 0) return res.status(409).json({ error: `A user with email ${cleanEmail} already exists.` });

        // No password is created. People sign in with Google, so there is nothing to leak or reset.
        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, department, designation, phone, is_active)
             VALUES (?, ?, 'GOOGLE_SSO', ?, ?, ?, ?, 1)`,
            [String(name).trim(), cleanEmail, role, department, String(designation).trim(), String(phone).trim()]
        );

        return res.json({
            success: true,
            message: `${name} can now sign in with ${cleanEmail}.`,
            user: { id: result.insertId, name: String(name).trim(), email: cleanEmail, role, department, designation: String(designation).trim(), is_active: 1 }
        });
    } catch (err) {
        console.error('Error creating user in it-ops:', err);
        return res.status(500).json({ error: 'Failed to create user' });
    }
});

// 5. Update user
router.put('/users/:id', verifyItOps, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, department, designation, phone, is_active } = req.body || {};

        const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'User not found' });

        if (role !== undefined && !ROLES.includes(role)) {
            return res.status(400).json({ error: `Role must be one of: ${ROLES.join(', ')}` });
        }

        const updates = [];
        const params = [];
        if (name !== undefined) { updates.push('name = ?'); params.push(String(name).trim()); }
        if (email !== undefined) { updates.push('email = ?'); params.push(String(email).trim().toLowerCase()); }
        if (role !== undefined) { updates.push('role = ?'); params.push(role); }
        if (department !== undefined) { updates.push('department = ?'); params.push(department); }
        if (designation !== undefined) { updates.push('designation = ?'); params.push(String(designation).trim()); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(String(phone).trim()); }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields provided to update' });

        params.push(id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        invalidateAccount(id); // a deactivated or re-roled account stops working at once

        return res.json({ success: true, message: `User #${id} updated.` });
    } catch (err) {
        console.error('Error updating user in it-ops:', err);
        return res.status(500).json({ error: 'Failed to update user' });
    }
});

// 6. Delete user
router.delete('/users/:id', verifyItOps, async (req, res) => {
    try {
        const { id } = req.params;
        const [user] = await pool.query('SELECT name, email FROM users WHERE id = ?', [id]);
        if (user.length === 0) return res.status(404).json({ error: 'User not found' });

        const [[history]] = await pool.query('SELECT COUNT(*) AS n FROM attendance_records WHERE student_id = ? OR staff_id = ?', [id, id]);
        if (history.n > 0) {
            return res.status(409).json({
                error: `${user[0].name} has ${history.n} attendance records. Deactivate the account instead, so the history is kept.`
            });
        }

        try {
            await pool.query('DELETE FROM users WHERE id = ?', [id]);
        } catch (e) {
            if (e && (e.code === 'ER_ROW_IS_REFERENCED_2' || e.code === 'ER_ROW_IS_REFERENCED')) {
                return res.status(409).json({ error: `${user[0].name} is referenced by other records. Deactivate the account instead.` });
            }
            throw e;
        }
        invalidateAccount(id);
        return res.json({ success: true, message: `Removed ${user[0].name} (${user[0].email}).` });
    } catch (err) {
        console.error('Error deleting user in it-ops:', err);
        return res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
