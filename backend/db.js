const mysql = require('mysql2/promise');
require('dotenv').config();

// Production-tuned connection pool to balance load during high-concurrency 5-minute OTP rollcalls
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '2525',
    database: process.env.DB_NAME || 'otp_attendance',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '50', 10), // Scaled up for peak student submissions
    maxIdle: 20, // Keep warm idle connections ready
    idleTimeout: 60000, // 60s idle before recycling
    queueLimit: 0, // Unbounded queue with queue-wait handling
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

pool.getConnection()
    .then(conn => {
        console.log('✓ Successfully connected to MySQL database: otp_attendance (Pool limit: 50)');
        conn.release();
    })
    .catch(err => {
        console.error('✗ MySQL Connection Error:', err.message);
    });

module.exports = pool;
