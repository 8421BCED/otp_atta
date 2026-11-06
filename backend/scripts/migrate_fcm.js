const pool = require('../db');

async function migrate() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS fcm_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                role VARCHAR(50) NULL,
                department VARCHAR(50) NULL,
                token TEXT NOT NULL,
                device_info VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_token (user_id, token(191))
            )
        `);
        console.log('✓ fcm_tokens table ready');
        process.exit(0);
    } catch (e) {
        console.error('Migration error:', e);
        process.exit(1);
    }
}

migrate();

