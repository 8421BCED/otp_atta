const pool = require('../db');

async function optimizeIndexes() {
    console.log('Optimizing database indexes for production throughput...');

    const queries = [
        // Attendance records high speed lookups
        "ALTER TABLE attendance_records ADD INDEX idx_att_lookup (student_id, date, period_id)",
        "ALTER TABLE attendance_records ADD INDEX idx_room_date (room_id, date)",
        "ALTER TABLE attendance_records ADD INDEX idx_date_status (date, status)",

        // Active OTP 10s lookups
        "ALTER TABLE active_otps ADD INDEX idx_room_expire (room_id, expires_at)",
        "ALTER TABLE active_otps ADD INDEX idx_period (period_id)",

        // Student day locks lookup
        "ALTER TABLE student_day_locks ADD INDEX idx_student_date (student_id, date)",

        // Device locks
        "ALTER TABLE device_locks ADD INDEX idx_user_device (user_id, device_id)",

        // Staff movements
        "ALTER TABLE staff_movements ADD INDEX idx_staff_date (staff_id, date)",

        // Users lookup
        "ALTER TABLE users ADD INDEX idx_role_dept (role, department)",
        "ALTER TABLE users ADD INDEX idx_email (email)"
    ];

    for (const q of queries) {
        try {
            await pool.query(q);
            console.log('✓ Success:', q.slice(0, 50) + '...');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME') {
                console.log('- Index already exists:', q.slice(0, 50));
            } else {
                console.warn('! Notice:', e.message);
            }
        }
    }

    console.log('Database indexing check complete.');
    process.exit(0);
}

optimizeIndexes().catch(e => {
    console.error(e);
    process.exit(1);
});

