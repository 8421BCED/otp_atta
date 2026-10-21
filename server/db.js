const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '2525',
    database: process.env.DB_NAME || 'otp_attendance',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then(conn => {
        console.log('✓ Successfully connected to MySQL database: otp_attendance');
        conn.release();
    })
    .catch(err => {
        console.error('✗ MySQL Connection Error:', err.message);
    });

module.exports = pool;
