const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');

const MASTER_PASS = 'ItOperations@12345';

// Middleware to check IT Operations authorization header
function verifyItOps(req, res, next) {
    const authPass = req.headers['x-it-ops-key'] || req.query.key;
    if (authPass !== MASTER_PASS) {
        return res.status(401).json({ error: 'Unauthorized: Invalid IT Operations Master Passphrase' });
    }
    next();
}

// 1. Verify Passphrase
router.post('/verify', (req, res) => {
    const { pass } = req.body;
    if (pass === MASTER_PASS) {
        return res.json({ success: true, message: 'IT Operations Console Unlocked' });
    }
    return res.status(401).json({ success: false, error: 'Incorrect IT Operations Master Passphrase' });
});

// 2. Get Stats Summary
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

        return res.json({
            stats: counts[0],
            departments: depts
        });
    } catch (err) {
        console.error('Error in it-ops stats:', err);
        return res.status(500).json({ error: 'Failed to fetch IT Ops stats' });
    }
});

// 3. List Users with Search and Filters
router.get('/users', verifyItOps, async (req, res) => {
    try {
        const { q, role, department, status, limit = 200 } = req.query;

        let query = 'SELECT id, name, email, role, department, designation, roll_number, year_of_study, phone, is_active, created_at FROM users WHERE 1=1';
        const params = [];

        if (q && q.trim()) {
            const search = `%${q.trim()}%`;
            query += ' AND (name LIKE ? OR email LIKE ? OR designation LIKE ? OR roll_number LIKE ?)';
            params.push(search, search, search, search);
        }

        if (role && role !== 'all') {
            query += ' AND role = ?';
            params.push(role);
        }

        if (department && department !== 'all') {
            query += ' AND department = ?';
            params.push(department);
        }

        if (status === 'active') {
            query += ' AND is_active = 1';
        } else if (status === 'inactive') {
            query += ' AND is_active = 0';
        }

        query += ' ORDER BY role = "principal" DESC, role = "hod" DESC, department ASC, name ASC LIMIT ?';
        params.push(parseInt(limit));

        const [users] = await pool.query(query, params);
        return res.json({ users, total: users.length });
    } catch (err) {
        console.error('Error fetching users in it-ops:', err);
        return res.status(500).json({ error: 'Failed to fetch users list' });
    }
});

// 4. Create New Staff / Faculty / User
router.post('/users', verifyItOps, async (req, res) => {
    try {
        const { name, email, role = 'staff', department = 'IT', designation = '', phone = '', password } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and Email are required' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if (existing.length > 0) {
            return res.status(409).json({ error: `A user with email ${cleanEmail} already exists.` });
        }

        const rawPassword = password && password.trim() ? password.trim() : 'Fxec@123';
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, department, designation, phone, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [name.trim(), cleanEmail, passwordHash, role, department, designation.trim(), phone.trim()]
        );

        return res.json({
            success: true,
            message: `Faculty member ${name} created successfully.`,
            user: {
                id: result.insertId,
                name: name.trim(),
                email: cleanEmail,
                role,
                department,
                designation: designation.trim(),
                is_active: 1
            }
        });
    } catch (err) {
        console.error('Error creating user in it-ops:', err);
        return res.status(500).json({ error: 'Failed to create user' });
    }
});

// 5. Update User (Role promotion/demotion, Department transfer, Status change, etc.)
router.put('/users/:id', verifyItOps, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, department, designation, phone, is_active, resetPassword } = req.body;

        const [existing] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email.trim().toLowerCase()); }
        if (role !== undefined) { updates.push('role = ?'); params.push(role); }
        if (department !== undefined) { updates.push('department = ?'); params.push(department); }
        if (designation !== undefined) { updates.push('designation = ?'); params.push(designation.trim()); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone.trim()); }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

        if (resetPassword) {
            const defaultHash = await bcrypt.hash('Fxec@123', 10);
            updates.push('password_hash = ?');
            params.push(defaultHash);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields provided to update' });
        }

        params.push(id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

        return res.json({
            success: true,
            message: `User #${id} updated successfully.`,
            resetPasswordApplied: !!resetPassword
        });
    } catch (err) {
        console.error('Error updating user in it-ops:', err);
        return res.status(500).json({ error: 'Failed to update user' });
    }
});

// 6. Delete User / Purge
router.delete('/users/:id', verifyItOps, async (req, res) => {
    try {
        const { id } = req.params;
        const [user] = await pool.query('SELECT name, email, role FROM users WHERE id = ?', [id]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove active OTPs, device locks, attendance records if any, then delete
        await pool.query('DELETE FROM device_locks WHERE user_id = ?', [id]);
        await pool.query('DELETE FROM users WHERE id = ?', [id]);

        return res.json({
            success: true,
            message: `Faculty record for "${user[0].name}" (${user[0].email}) deleted from system.`
        });
    } catch (err) {
        console.error('Error deleting user in it-ops:', err);
        return res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
