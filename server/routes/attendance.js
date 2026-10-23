const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Helper to get active period based on time (or simulated time)
const getPeriodForTime = (periods, timeStr) => {
    // timeStr in HH:MM:SS format
    for (const p of periods) {
        if (timeStr >= p.start_time && timeStr <= p.end_time) {
            return p;
        }
    }
    // If before first period
    if (periods.length > 0 && timeStr < periods[0].start_time) {
        return { isBeforeCollege: true, nextPeriod: periods[0] };
    }
    // If after last period
    if (periods.length > 0 && timeStr > periods[periods.length - 1].end_time) {
        return { isAfterCollege: true, lastPeriod: periods[periods.length - 1] };
    }
    return null;
};

// 1. Get Current Period & Schedule Info
router.get('/current-period', async (req, res) => {
    try {
        const [periods] = await pool.query('SELECT * FROM periods ORDER BY id ASC');

        // Allow simulation of time via query param e.g. ?simulateTime=09:02:00
        let now = new Date();
        let currentTimeStr = req.query.simulateTime;
        if (!currentTimeStr) {
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            currentTimeStr = `${hours}:${minutes}:${seconds}`;
        }

        const activePeriod = getPeriodForTime(periods, currentTimeStr);
        
        // Critical 9:00 - 9:05 AM Day Start Window Check
        const isMorningWindow = currentTimeStr >= '09:00:00' && currentTimeStr <= '09:05:00';
        const isPastMorningCutoff = currentTimeStr > '09:05:00';

        return res.json({
            currentTime: currentTimeStr,
            activePeriod: activePeriod && !activePeriod.isBeforeCollege && !activePeriod.isAfterCollege ? activePeriod : null,
            isBreak: activePeriod ? !!activePeriod.is_break : false,
            isBeforeCollege: !!(activePeriod && activePeriod.isBeforeCollege),
            isAfterCollege: !!(activePeriod && activePeriod.isAfterCollege),
            isMorningWindow,
            isPastMorningCutoff,
            allPeriods: periods
        });
    } catch (err) {
        console.error('Error getting current period:', err);
        return res.status(500).json({ error: 'Failed to get current period' });
    }
});

// 2. Staff: Generate 10-Second Rolling OTP
router.post('/generate-otp', authenticate, authorizeRoles('staff', 'hod'), async (req, res) => {
    try {
        const { roomId, periodId } = req.body;
        const staffId = req.user.id;

        if (!roomId || !periodId) {
            return res.status(400).json({ error: 'Room ID and Period ID are required' });
        }

        // Generate 6-digit random number
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Expire in 10 seconds
        const expiresAt = new Date(Date.now() + 10 * 1000);

        // Delete old active OTPs for this room
        await pool.query('DELETE FROM active_otps WHERE room_id = ?', [roomId]);

        // Insert new active OTP
        await pool.query(
            `INSERT INTO active_otps (room_id, staff_id, period_id, otp_code, expires_at)
             VALUES (?, ?, ?, ?, ?)`,
            [roomId, staffId, periodId, otpCode, expiresAt]
        );

        return res.json({
            success: true,
            otpCode,
            roomId,
            periodId,
            expiresInSeconds: 10,
            expiresAt: expiresAt.toISOString(),
            message: 'OTP generated. Valid for 10 seconds.'
        });
    } catch (err) {
        console.error('Error generating OTP:', err);
        return res.status(500).json({ error: 'Failed to generate OTP' });
    }
});

// 3. Staff: Get Currently Active OTP for Room
router.get('/active-otp/:roomId', authenticate, authorizeRoles('staff', 'hod'), async (req, res) => {
    try {
        const { roomId } = req.params;
        const [otps] = await pool.query(
            `SELECT * FROM active_otps 
             WHERE room_id = ? AND expires_at > NOW() 
             ORDER BY id DESC LIMIT 1`,
            [roomId]
        );

        if (otps.length === 0) {
            return res.json({ hasActiveOtp: false });
        }

        const otp = otps[0];
        const remainingMs = new Date(otp.expires_at).getTime() - Date.now();
        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

        return res.json({
            hasActiveOtp: true,
            otpCode: otp.otp_code,
            periodId: otp.period_id,
            remainingSeconds,
            expiresAt: otp.expires_at
        });
    } catch (err) {
        console.error('Error fetching active OTP:', err);
        return res.status(500).json({ error: 'Failed to fetch active OTP' });
    }
});

// 4. Staff/HOD/Principal: Live Room Roster and Student Count
router.get('/room-live-roster/:roomId', authenticate, async (req, res) => {
    try {
        const { roomId } = req.params;
        const today = new Date().toISOString().slice(0, 10);
        const periodId = req.query.periodId;

        // Fetch room info
        const [rooms] = await pool.query(
            `SELECT r.*, b.name as building_name, f.name as floor_name 
             FROM rooms r 
             JOIN buildings b ON r.building_id = b.id 
             JOIN floors f ON r.floor_id = f.id 
             WHERE r.id = ?`,
            [roomId]
        );

        if (rooms.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const roomInfo = rooms[0];

        // Fetch present students in this room for today (optionally filtered by period)
        let query = `
            SELECT ar.id, ar.marked_at, ar.status, u.id as student_id, u.name, u.email, u.roll_number, u.department, u.year_of_study
            FROM attendance_records ar
            JOIN users u ON ar.student_id = u.id
            WHERE ar.room_id = ? AND ar.date = ? AND ar.status = 'present'
        `;
        let params = [roomId, today];

        if (periodId) {
            query += ' AND ar.period_id = ?';
            params.push(periodId);
        }

        query += ' ORDER BY ar.marked_at DESC';

        const [students] = await pool.query(query, params);

        return res.json({
            room: roomInfo,
            presentCount: students.length,
            students
        });
    } catch (err) {
        console.error('Error fetching live room roster:', err);
        return res.status(500).json({ error: 'Failed to fetch room roster' });
    }
});

// 5. Student: Submit OTP for Attendance & Room Check-in
router.post('/submit-otp', authenticate, authorizeRoles('student'), async (req, res) => {
    try {
        const { roomId, otpCode, deviceInfo, periodId, currentTime } = req.body;
        const studentId = req.user.id;
        const today = new Date().toISOString().slice(0, 10);

        if (!roomId || !otpCode) {
            return res.status(400).json({ error: 'Room selection and 6-digit OTP code are required' });
        }

        // A. Anti-Proxy: Verify Device Lock
        const [locks] = await pool.query('SELECT * FROM device_locks WHERE user_id = ?', [studentId]);
        if (locks.length > 0) {
            const lock = locks[0];
            const incomingDeviceId = deviceInfo ? deviceInfo.deviceId : null;
            if (lock.is_locked && incomingDeviceId && lock.device_id !== incomingDeviceId) {
                return res.status(403).json({
                    code: 'DEVICE_MISMATCH',
                    error: 'Anti-Proxy Security Violation',
                    message: `This account is locked to your registered device: "${lock.device_name}". Attendance cannot be submitted from another mobile device.`
                });
            }
        }

        // B. Morning 9:00 - 9:05 AM Day-Start Lockout Check
        const [dayLock] = await pool.query('SELECT * FROM student_day_locks WHERE student_id = ? AND date = ?', [studentId, today]);
        if (dayLock.length > 0 && dayLock[0].is_locked_out) {
            return res.status(403).json({
                code: 'DAY_LOCKED_OUT',
                error: 'College Day Locked Out',
                message: 'You failed to verify your morning attendance between 9:00 AM and 9:05 AM. In accordance with college policy, your access is locked for the remainder of the day.'
            });
        }

        // C. Fetch target active OTP
        // Check if there is an active OTP for this code
        const [activeOtps] = await pool.query(
            `SELECT * FROM active_otps 
             WHERE otp_code = ? AND expires_at >= NOW() 
             ORDER BY id DESC LIMIT 1`,
            [otpCode.trim()]
        );

        if (activeOtps.length === 0) {
            return res.status(400).json({
                error: 'Invalid or Expired OTP',
                message: 'The OTP entered is either incorrect or expired (10-second validity window exceeded). Please enter the fresh OTP displayed by your staff.'
            });
        }

        const activeOtp = activeOtps[0];

        // D. Cross-Room Verification: Student's selected room MUST match Staff's room
        if (parseInt(activeOtp.room_id) !== parseInt(roomId)) {
            // Fetch both room numbers for crystal-clear error message
            const [roomNames] = await pool.query(
                'SELECT id, room_number, name FROM rooms WHERE id IN (?, ?)',
                [roomId, activeOtp.room_id]
            );
            const studentRoom = roomNames.find(r => r.id === parseInt(roomId));
            const otpRoom = roomNames.find(r => r.id === parseInt(activeOtp.room_id));

            return res.status(400).json({
                code: 'CROSS_ROOM_MISMATCH',
                error: 'Cross-Room Attendance Prohibited',
                message: `Location mismatch: You selected "${studentRoom ? studentRoom.room_number : roomId}", but this OTP was generated for room "${otpRoom ? otpRoom.room_number : activeOtp.room_id}". Please verify you are in the correct classroom.`
            });
        }

        const effectivePeriodId = periodId || activeOtp.period_id;

        // E. Check if already marked for this period today
        const [existing] = await pool.query(
            'SELECT * FROM attendance_records WHERE student_id = ? AND period_id = ? AND date = ?',
            [studentId, effectivePeriodId, today]
        );

        // Fetch room info for from & to rooms
        const [targetRooms] = await pool.query(
            'SELECT r.id, r.room_number, r.name, b.name as building_name FROM rooms r JOIN buildings b ON r.building_id = b.id WHERE r.id = ?',
            [roomId]
        );
        const targetRoomInfo = targetRooms[0] || { room_number: roomId, name: 'Room' };

        if (existing.length > 0) {
            const currentRecord = existing[0];
            // If already in this exact room
            if (parseInt(currentRecord.room_id) === parseInt(roomId)) {
                return res.status(409).json({
                    error: 'Attendance Already Recorded',
                    message: `You have already marked your attendance in Room ${targetRoomInfo.room_number} for this period.`
                });
            }

            // Student is RELOCATING to a new classroom or lab mid-period!
            const [oldRooms] = await pool.query(
                'SELECT r.id, r.room_number, r.name FROM rooms r WHERE r.id = ?',
                [currentRecord.room_id]
            );
            const oldRoomInfo = oldRooms[0] || { room_number: currentRecord.room_id, name: 'Previous Room' };

            // 1. Update attendance record with the new room and staff
            await pool.query(
                `UPDATE attendance_records 
                 SET room_id = ?, staff_id = ?, otp_used = ?, marked_at = NOW() 
                 WHERE id = ?`,
                [roomId, activeOtp.staff_id, otpCode, currentRecord.id]
            );

            // 2. Insert verified movement record into student_movements
            const moveNote = `Relocated from Room ${oldRoomInfo.room_number} to Room ${targetRoomInfo.room_number} (${targetRoomInfo.name}) - Verified via Lab Staff OTP`;
            await pool.query(
                `INSERT INTO student_movements 
                 (student_id, from_room_id, to_room_id, period_id, date, duration_minutes, note)
                 VALUES (?, ?, ?, ?, ?, 50, ?)`,
                [studentId, currentRecord.room_id, roomId, effectivePeriodId, today, moveNote]
            );

            return res.json({
                success: true,
                isRelocation: true,
                message: `Arrival verified! You are now checked into Room ${targetRoomInfo.room_number} (${targetRoomInfo.name}). Movement recorded.`,
                periodId: effectivePeriodId,
                roomId
            });
        }

        // F. Initial Check-in: Insert Attendance Record
        await pool.query(
            `INSERT INTO attendance_records 
            (student_id, period_id, room_id, staff_id, date, status, otp_used, device_id)
            VALUES (?, ?, ?, ?, ?, 'present', ?, ?)`,
            [studentId, effectivePeriodId, roomId, activeOtp.staff_id, today, otpCode, deviceInfo ? deviceInfo.deviceId : null]
        );

        // G. Update / Record Initial Movement
        const [lastMovement] = await pool.query(
            'SELECT * FROM student_movements WHERE student_id = ? AND date = ? ORDER BY id DESC LIMIT 1',
            [studentId, today]
        );
        const fromRoomId = lastMovement.length > 0 ? lastMovement[0].to_room_id : null;

        await pool.query(
            `INSERT INTO student_movements 
            (student_id, from_room_id, to_room_id, period_id, date, duration_minutes, note)
            VALUES (?, ?, ?, ?, ?, 50, ?)`,
            [studentId, fromRoomId, roomId, effectivePeriodId, today, `Checked in to Room ${targetRoomInfo.room_number} via 10s OTP`]
        );

        // H. If 1st period, record day unlock
        if (effectivePeriodId === 1) {
            await pool.query(
                `INSERT INTO student_day_locks (student_id, date, first_otp_at, is_locked_out)
                 VALUES (?, ?, NOW(), 0)
                 ON DUPLICATE KEY UPDATE first_otp_at = NOW(), is_locked_out = 0`,
                [studentId, today]
            );
        }

        return res.json({
            success: true,
            message: `Attendance verified and marked present in Room ${targetRoomInfo.room_number}!`,
            periodId: effectivePeriodId,
            roomId
        });
    } catch (err) {
        console.error('Error submitting OTP:', err);
        return res.status(500).json({ error: 'Failed to record attendance' });
    }
});

// 6. Student: Room / Lab Movement (Switching classes)
router.post('/move-room', authenticate, authorizeRoles('student'), async (req, res) => {
    try {
        const { toRoomId, periodId, note } = req.body;
        const studentId = req.user.id;
        const today = new Date().toISOString().slice(0, 10);

        if (!toRoomId) {
            return res.status(400).json({ error: 'Destination room is required' });
        }

        // Get last location
        const [last] = await pool.query(
            'SELECT to_room_id FROM student_movements WHERE student_id = ? AND date = ? ORDER BY id DESC LIMIT 1',
            [studentId, today]
        );
        const fromRoomId = last.length > 0 ? last[0].to_room_id : null;

        await pool.query(
            `INSERT INTO student_movements (student_id, from_room_id, to_room_id, period_id, date, note)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [studentId, fromRoomId, toRoomId, periodId || 1, today, note || 'Relocated to class/lab']
        );

        return res.json({ success: true, message: 'Location updated. Ready for room OTP.' });
    } catch (err) {
        console.error('Error logging movement:', err);
        return res.status(500).json({ error: 'Failed to record movement' });
    }
});

// 7. Student Daily Timeline & Movements
router.get('/student-timeline/:studentId', authenticate, async (req, res) => {
    try {
        const { studentId } = req.params;
        const today = req.query.date || new Date().toISOString().slice(0, 10);

        // Fetch all periods
        const [periods] = await pool.query('SELECT * FROM periods ORDER BY id ASC');

        // Fetch student's attendance records for the day
        const [attendance] = await pool.query(
            `SELECT ar.*, r.room_number, r.name as room_name, b.name as building_name 
             FROM attendance_records ar
             JOIN rooms r ON ar.room_id = r.id
             JOIN buildings b ON r.building_id = b.id
             WHERE ar.student_id = ? AND ar.date = ?`,
            [studentId, today]
        );

        // Fetch movements
        const [movements] = await pool.query(
            `SELECT sm.*, r_to.room_number as to_room, r_from.room_number as from_room,
                    b_to.name as building_to
             FROM student_movements sm
             JOIN rooms r_to ON sm.to_room_id = r_to.id
             LEFT JOIN rooms r_from ON sm.from_room_id = r_from.id
             JOIN buildings b_to ON r_to.building_id = b_to.id
             WHERE sm.student_id = ? AND sm.date = ?
             ORDER BY sm.timestamp ASC`,
            [studentId, today]
        );

        // Combine period schedule with attendance status
        const timeline = periods.map(p => {
            const att = attendance.find(a => a.period_id === p.id);
            return {
                ...p,
                attendance: att || null,
                isMarked: !!att,
                status: att ? att.status : (p.is_break ? 'break' : 'pending')
            };
        });

        return res.json({
            date: today,
            timeline,
            movements,
            totalPresent: attendance.filter(a => a.status === 'present' || a.status === 'od').length
        });
    } catch (err) {
        console.error('Error fetching student timeline:', err);
        return res.status(500).json({ error: 'Failed to fetch timeline' });
    }
});

// 9. Full Student Profile, Location, Yesterday & Calendar History (Staff / HOD inspection)
router.get('/student-details/:studentId', authenticate, async (req, res) => {
    try {
        const { studentId } = req.params;
        const [users] = await pool.query(
            'SELECT id, name, email, roll_number, department, year_of_study FROM users WHERE id = ? AND role = "student"',
            [studentId]
        );
        if (users.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        const student = users[0];

        // Device lock info
        const [locks] = await pool.query('SELECT * FROM device_locks WHERE user_id = ?', [studentId]);
        const deviceLock = locks.length > 0 ? locks[0] : null;

        const today = new Date().toISOString().slice(0, 10);
        const yDate = new Date();
        yDate.setDate(yDate.getDate() - 1);
        const yesterday = yDate.toISOString().slice(0, 10);

        // Current location from latest student movement
        const [latestMove] = await pool.query(
            `SELECT sm.*, r.room_number, r.name as room_name, b.name as building_name, f.name as floor_name
             FROM student_movements sm
             JOIN rooms r ON sm.to_room_id = r.id
             JOIN buildings b ON r.building_id = b.id
             JOIN floors f ON r.floor_id = f.id
             WHERE sm.student_id = ?
             ORDER BY sm.timestamp DESC LIMIT 1`,
            [studentId]
        );

        // Today's attendance records with room & period
        const [todayRecords] = await pool.query(
            `SELECT ar.*, p.name as period_name, p.start_time, p.end_time, r.room_number, r.name as room_name, b.name as building_name
             FROM attendance_records ar
             JOIN periods p ON ar.period_id = p.id
             LEFT JOIN rooms r ON ar.room_id = r.id
             LEFT JOIN buildings b ON r.building_id = b.id
             WHERE ar.student_id = ? AND ar.date = ?
             ORDER BY p.id ASC`,
            [studentId, today]
        );

        // Yesterday's attendance records (Where was the student yesterday at this time?)
        const [yesterdayRecords] = await pool.query(
            `SELECT ar.*, p.name as period_name, p.start_time, p.end_time, r.room_number, r.name as room_name, b.name as building_name
             FROM attendance_records ar
             JOIN periods p ON ar.period_id = p.id
             LEFT JOIN rooms r ON ar.room_id = r.id
             LEFT JOIN buildings b ON r.building_id = b.id
             WHERE ar.student_id = ? AND ar.date = ?
             ORDER BY p.id ASC`,
            [studentId, yesterday]
        );

        // Stats summary: present and od both count towards attendance credit
        const [stats] = await pool.query(
            `SELECT COUNT(*) as total_periods, 
                    SUM(CASE WHEN status IN ('present', 'od') THEN 1 ELSE 0 END) as present_periods
             FROM attendance_records
             WHERE student_id = ?`,
            [studentId]
        );

        // Past 14 days history breakdown
        const [pastDates] = await pool.query(
            `SELECT ar.date, 
                    COUNT(DISTINCT ar.period_id) as periods_marked,
                    MAX(r.room_number) as last_room,
                    MAX(b.name) as last_building
             FROM attendance_records ar
             LEFT JOIN rooms r ON ar.room_id = r.id
             LEFT JOIN buildings b ON r.building_id = b.id
             WHERE ar.student_id = ? AND ar.status IN ('present', 'od')
             GROUP BY ar.date
             ORDER BY ar.date DESC LIMIT 14`,
            [studentId]
        );

        // Full Student Movement Trail (Every classroom & lab transfer with timestamps)
        const [movements] = await pool.query(
            `SELECT sm.*, 
                    r_to.room_number as to_room, r_to.name as to_room_name, b_to.name as to_building,
                    r_from.room_number as from_room, r_from.name as from_room_name, b_from.name as from_building
             FROM student_movements sm
             JOIN rooms r_to ON sm.to_room_id = r_to.id
             JOIN buildings b_to ON r_to.building_id = b_to.id
             LEFT JOIN rooms r_from ON sm.from_room_id = r_from.id
             LEFT JOIN buildings b_from ON r_from.building_id = b_from.id
             WHERE sm.student_id = ?
             ORDER BY sm.timestamp DESC LIMIT 25`,
            [studentId]
        );

        return res.json({
            student,
            currentLocation: latestMove.length > 0 ? latestMove[0] : null,
            deviceLock,
            todayRecords,
            yesterdayRecords,
            movements,
            stats: {
                totalPeriods: stats[0].total_periods || 0,
                presentPeriods: stats[0].present_periods || 0,
                percentage: stats[0].total_periods > 0 
                    ? Math.round((stats[0].present_periods / stats[0].total_periods) * 100) 
                    : 100
            },
            pastDates
        });
    } catch (err) {
        console.error('Error fetching student details:', err);
        return res.status(500).json({ error: 'Failed to fetch student details' });
    }
});

module.exports = router;
