const mysql = require('mysql2/promise');
const { AsyncLocalStorage } = require('async_hooks');
require('dotenv').config({ quiet: true });

// One pool per Node worker. With PM2 cluster mode the total connections are
// DB_CONNECTION_LIMIT x number of workers, so keep the per-worker limit modest.
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'otp_attendance',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '15', 10),
    maxIdle: 8,
    idleTimeout: 60000,
    queueLimit: 200, // fail fast under overload instead of queueing forever
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    // College time everywhere: JS dates and MySQL NOW() agree, DATE columns stay plain strings.
    timezone: '+05:30',
    dateStrings: ['DATE'],
    charset: 'utf8mb4'
});

pool.pool.on('connection', (conn) => {
    conn.query("SET time_zone = '+05:30'");
});

// When the database is saturated the pool refuses new work ("Queue limit reached"). Routes catch their own errors
// and would answer 500. Remember the overload on the current request, so the response becomes a 503 with a
// Retry-After header, which the app understands as "slow down" (see index.js).
const als = new AsyncLocalStorage();
const flagBusy = (err) => {
    if (err && /Queue limit reached/i.test(err.message || '')) {
        const ctx = als.getStore();
        if (ctx && ctx.res) ctx.res.locals.dbBusy = true;
    }
};
for (const method of ['query', 'getConnection', 'execute']) {
    const original = pool[method].bind(pool);
    pool[method] = async (...args) => {
        try { return await original(...args); } catch (err) { flagBusy(err); throw err; }
    };
}
pool.requestContext = als;

pool.getConnection()
    .then((conn) => {
        console.log(`MySQL connected: ${process.env.DB_NAME || 'otp_attendance'} (pool ${pool.pool.config.connectionLimit})`);
        conn.release();
    })
    .catch((err) => {
        console.error('MySQL connection error:', err.message);
    });

module.exports = pool;
