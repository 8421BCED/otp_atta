const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// 1. Get complete location hierarchy (Buildings -> Floors -> Rooms)
router.get('/hierarchy', async (req, res) => {
    try {
        const [buildings] = await pool.query('SELECT * FROM buildings ORDER BY id ASC');
        const [floors] = await pool.query('SELECT * FROM floors ORDER BY building_id, floor_number ASC');
        const [rooms] = await pool.query('SELECT * FROM rooms ORDER BY building_id, floor_id, room_number ASC');

        const hierarchy = buildings.map(b => {
            const bFloors = floors.filter(f => f.building_id === b.id).map(f => {
                const fRooms = rooms.filter(r => r.floor_id === f.id);
                return {
                    ...f,
                    rooms: fRooms
                };
            });
            return {
                ...b,
                floors: bFloors
            };
        });

        return res.json({ hierarchy, allRooms: rooms });
    } catch (err) {
        console.error('Error fetching hierarchy:', err);
        return res.status(500).json({ error: 'Failed to fetch location hierarchy' });
    }
});

// 2. Add Building (Principal only)
router.post('/buildings', authenticate, authorizeRoles('principal'), async (req, res) => {
    try {
        const { name, code, description } = req.body;
        if (!name || !code) {
            return res.status(400).json({ error: 'Building name and code are required' });
        }
        const [result] = await pool.query(
            'INSERT INTO buildings (name, code, description) VALUES (?, ?, ?)',
            [name, code.toUpperCase(), description || '']
        );
        return res.status(201).json({ message: 'Building added', buildingId: result.insertId });
    } catch (err) {
        console.error('Error creating building:', err);
        return res.status(500).json({ error: 'Failed to create building' });
    }
});

// 3. Add Room (Principal only)
router.post('/rooms', authenticate, authorizeRoles('principal'), async (req, res) => {
    try {
        const { building_id, floor_id, room_number, name, room_type, department, capacity } = req.body;
        if (!building_id || !floor_id || !room_number || !name) {
            return res.status(400).json({ error: 'Building, Floor, Room number, and Name are required' });
        }
        const [result] = await pool.query(
            `INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department, capacity) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [building_id, floor_id, room_number, name, room_type || 'classroom', department || 'IT', capacity || 60]
        );
        return res.status(201).json({ message: 'Room created successfully', roomId: result.insertId });
    } catch (err) {
        console.error('Error creating room:', err);
        return res.status(500).json({ error: 'Failed to create room' });
    }
});

// 4. Add Floor to Building (Principal only)
router.post('/floors', authenticate, authorizeRoles('principal'), async (req, res) => {
    try {
        const { building_id, floor_number, name } = req.body;
        if (!building_id || floor_number === undefined || !name) {
            return res.status(400).json({ error: 'Building ID, floor number, and name are required' });
        }
        const [result] = await pool.query(
            'INSERT INTO floors (building_id, floor_number, name) VALUES (?, ?, ?)',
            [building_id, floor_number, name]
        );
        return res.status(201).json({ message: 'Floor added successfully', floorId: result.insertId });
    } catch (err) {
        console.error('Error creating floor:', err);
        return res.status(500).json({ error: 'Failed to create floor' });
    }
});

// 5. Delete Room (Principal only)
router.delete('/rooms/:id', authenticate, authorizeRoles('principal'), async (req, res) => {
    try {
        await pool.query('DELETE FROM rooms WHERE id = ?', [req.params.id]);
        return res.json({ success: true, message: 'Room deleted successfully' });
    } catch (err) {
        console.error('Error deleting room:', err);
        return res.status(500).json({ error: 'Failed to delete room' });
    }
});

// 6. Delete Building (Principal only)
router.delete('/buildings/:id', authenticate, authorizeRoles('principal'), async (req, res) => {
    try {
        await pool.query('DELETE FROM rooms WHERE building_id = ?', [req.params.id]);
        await pool.query('DELETE FROM floors WHERE building_id = ?', [req.params.id]);
        await pool.query('DELETE FROM buildings WHERE id = ?', [req.params.id]);
        return res.json({ success: true, message: 'Building and associated rooms deleted' });
    } catch (err) {
        console.error('Error deleting building:', err);
        return res.status(500).json({ error: 'Failed to delete building' });
    }
});

module.exports = router;
