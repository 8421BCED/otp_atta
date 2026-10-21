const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// 1. Get all holidays
router.get('/', async (req, res) => {
    try {
        const [holidays] = await pool.query(
            `SELECT h.*, u.name as declared_by_name, u.role as declared_by_role 
             FROM holidays h 
             JOIN users u ON h.declared_by = u.id 
             ORDER BY h.holiday_date ASC`
        );
        return res.json({ holidays });
    } catch (err) {
        console.error('Error fetching holidays:', err);
        return res.status(500).json({ error: 'Failed to fetch holidays' });
    }
});

// 2. Check if a specific date (or today) is a holiday
router.get('/check', async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const department = req.query.department || 'IT';

        const [results] = await pool.query(
            `SELECT * FROM holidays 
             WHERE holiday_date = ? AND (scope = 'college' OR (scope = 'department' AND department = ?))
             ORDER BY scope ASC`,
            [date, department]
        );

        if (results.length > 0) {
            const h = results[0];
            return res.json({
                isHoliday: true,
                title: h.title,
                scope: h.scope,
                department: h.department,
                reason: h.reason
            });
        }

        return res.json({ isHoliday: false });
    } catch (err) {
        console.error('Error checking holiday:', err);
        return res.status(500).json({ error: 'Failed to check holiday status' });
    }
});

// 3. Declare Holiday (HOD: Department Only; Principal: College-Wide with Conflict Resolution)
router.post('/declare', authenticate, authorizeRoles('hod', 'principal'), async (req, res) => {
    try {
        const { title, holiday_date, scope, department, reason } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!title || !holiday_date) {
            return res.status(400).json({ error: 'Title and holiday date are required' });
        }

        // Determine effective scope & department based on role
        let effectiveScope = scope || (userRole === 'principal' ? 'college' : 'department');
        let effectiveDept = userRole === 'principal' ? (effectiveScope === 'college' ? 'ALL' : (department || 'ALL')) : req.user.department;

        // If HOD attempts to declare college-wide, restrict to department
        if (userRole === 'hod') {
            effectiveScope = 'department';
            effectiveDept = req.user.department;
        }

        // --- CONFLICT RESOLUTION ---
        // A. Check if a college-wide holiday already exists for this date
        const [collegeHolidays] = await pool.query(
            'SELECT * FROM holidays WHERE holiday_date = ? AND scope = "college"',
            [holiday_date]
        );

        if (collegeHolidays.length > 0 && effectiveScope === 'department') {
            return res.status(409).json({
                conflict: true,
                message: `Resolved: ${holiday_date} is already declared as a College-wide Holiday ("${collegeHolidays[0].title}") by the Principal. No separate department declaration is needed.`
            });
        }

        // B. If Principal declares a College-wide holiday, clean up existing department-level duplicates for this date
        if (effectiveScope === 'college') {
            await pool.query('DELETE FROM holidays WHERE holiday_date = ? AND scope = "department"', [holiday_date]);
        }

        // C. Check if same department holiday already exists
        const [existing] = await pool.query(
            'SELECT * FROM holidays WHERE holiday_date = ? AND scope = ? AND department = ?',
            [holiday_date, effectiveScope, effectiveDept]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'A holiday for this date and department/college already exists.' });
        }

        await pool.query(
            `INSERT INTO holidays (title, holiday_date, scope, department, declared_by, reason)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [title, holiday_date, effectiveScope, effectiveDept, userId, reason || 'Declared by Academic Authority']
        );

        return res.status(201).json({
            success: true,
            message: `Holiday declared successfully (${effectiveScope === 'college' ? 'College-Wide' : effectiveDept + ' Department'})`,
            conflictResolved: collegeHolidays.length > 0 || (effectiveScope === 'college')
        });
    } catch (err) {
        console.error('Error declaring holiday:', err);
        return res.status(500).json({ error: 'Failed to declare holiday' });
    }
});

module.exports = router;
