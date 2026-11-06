const pool = require('../db');

async function migrateLeave() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS leave_applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                type ENUM('internal', 'external') NOT NULL DEFAULT 'internal',
                event_name VARCHAR(255) NOT NULL,
                category VARCHAR(100) DEFAULT 'Symposium / Hackathon',
                venue VARCHAR(255) DEFAULT '',
                from_date DATE NOT NULL,
                to_date DATE NOT NULL,
                is_all_day TINYINT(1) DEFAULT 1,
                from_period INT DEFAULT 1,
                to_period INT DEFAULT 7,
                reason TEXT NOT NULL,
                mentor_id INT NULL,
                status ENUM('pending_mentor', 'pending_hod', 'approved', 'rejected') NOT NULL DEFAULT 'pending_mentor',
                mentor_remarks TEXT NULL,
                mentor_reviewed_at DATETIME NULL,
                hod_remarks TEXT NULL,
                hod_reviewed_at DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_student (student_id),
                INDEX idx_status (status),
                INDEX idx_dates (from_date, to_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✓ Successfully created leave_applications table in MySQL');
        process.exit(0);
    } catch (err) {
        console.error('Error creating leave_applications:', err);
        process.exit(1);
    }
}

migrateLeave();
