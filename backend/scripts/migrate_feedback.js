const pool = require('../db');

async function migrate() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_feedbacks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                user_name VARCHAR(255) NULL,
                user_email VARCHAR(255) NULL,
                user_role VARCHAR(50) NULL,
                category VARCHAR(100) DEFAULT 'General Feedback',
                message TEXT NOT NULL,
                rating INT DEFAULT 5,
                device_info VARCHAR(255) NULL,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ user_feedbacks table created successfully');
        process.exit(0);
    } catch (e) {
        console.error('Migration error:', e);
        process.exit(1);
    }
}

migrate();

