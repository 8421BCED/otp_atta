const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const config = require('./config'); // validates required environment variables first
const pool = require('./db');
const { userIdFromRequest } = require('./middleware/auth');
const push = require('./utils/push');

const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/location');
const attendanceRoutes = require('./routes/attendance');
const hodRoutes = require('./routes/hod');
const principalRoutes = require('./routes/principal');
const holidayRoutes = require('./routes/holidays');
const itOpsRoutes = require('./routes/itOps');
const sportsRoutes = require('./routes/sports');
const headcountRoutes = require('./routes/headcount');
const leaveRoutes = require('./routes/leave');
const feedbackRoutes = require('./routes/feedback');
const { router: notificationRoutes } = require('./routes/notifications');

const app = express();
app.disable('x-powered-by');

// Number of reverse proxies in front of this process (nginx = 1). Needed for real client IPs.
app.set('trust proxy', config.trustProxyHops);

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", 'https://accounts.google.com', 'https://apis.google.com', 'https://www.gstatic.com'],
            'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
            'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
            'img-src': ["'self'", 'data:', 'blob:', 'https:'],
            'connect-src': ["'self'", 'https://accounts.google.com', 'https://*.googleapis.com', 'https://*.firebaseio.com', 'https://*.gstatic.com'],
            'frame-src': ["'self'", 'https://accounts.google.com'],
            'worker-src': ["'self'", 'blob:'],
            'object-src': ["'none'"],
            'frame-ancestors': ["'self'"],
            'upgrade-insecure-requests': config.isProd ? [] : null
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' } // Google sign-in popup
}));

app.use(compression({ threshold: 1024 }));

// ---------------------------------------------------------------------------
// CORS: the app is served from this same origin, so only listed origins get CORS headers.
// ---------------------------------------------------------------------------
const devOrigins = config.isProd ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5000'];
const allowedOrigins = new Set([...config.corsOrigins, ...devOrigins]);
app.use(cors({
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-IT-Ops-Token']
}));

// ---------------------------------------------------------------------------
// Body parsing. Only the headcount upload needs a large limit.
// ---------------------------------------------------------------------------
app.use('/api/headcount', express.json({ limit: '9mb' }));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));

// Headcount photos use unguessable names and are deleted after an hour.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: 0,
    etag: true,
    index: false,
    setHeaders: (res) => res.setHeader('Cache-Control', 'private, no-store')
}));

// ---------------------------------------------------------------------------
// Rate limits.
// A whole campus sits behind one Wi-Fi address, so limiting by IP would punish everyone for the
// traffic of a few. Signed-in requests are limited per USER (the id inside a verified token).
// Only anonymous requests share a per-IP bucket, and those are just the sign-in page and its checks.
// ---------------------------------------------------------------------------
// Overload handling: if the database was saturated while serving a request, any "500" a route is about to send
// becomes "503 busy, retry in a few seconds". The app backs its polling off when it sees that.
app.use('/api', (req, res, next) => {
    const original = res.status.bind(res);
    res.status = (code) => {
        if (code === 500 && res.locals.dbBusy) {
            res.setHeader('Retry-After', '3');
            return original(503);
        }
        return original(code);
    };
    pool.requestContext.run({ res }, next);
});

// The phone's clock. Tiny, no database, no login, and outside the rate limit: it is how every screen
// stays on true college time even when the phone's own clock is wrong.
app.get('/api/time', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ now: Date.now() });
});

const identify = (req) => {
    if (req._rlKey === undefined) {
        const uid = userIdFromRequest(req);
        req._rlKey = uid ? `user:${uid}` : `ip:${ipKeyGenerator(req.ip)}`;
        req._rlAuthed = !!uid;
    }
    return req._rlKey;
};

app.use('/api/', rateLimit({
    windowMs: 60 * 1000,
    // Signed in: 300 a minute per person (a student's app needs about 8). Signed out: the sign-in page
    // makes a few cheap calls per student, and 2,500 students open the app together each morning.
    limit: (req) => { identify(req); return req._rlAuthed ? 300 : 6000; },
    keyGenerator: identify,
    skip: (req) => req.path === '/health' || req.path === '/ready',
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a moment and try again.' }
}));

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${String(req.body?.email || '').toLowerCase().slice(0, 150)}`,
    message: { error: 'Too many sign-in attempts. Try again in a few minutes.' }
});
app.use('/api/auth/login', loginLimiter);
// Many students sign in within the same few minutes each morning, from one address.
app.use('/api/auth/google', rateLimit({
    windowMs: 60 * 1000, limit: 1200, standardHeaders: true, legacyHeaders: false,
    keyGenerator: (req) => `ip:${ipKeyGenerator(req.ip)}`
}));

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/principal', principalRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/it-ops', itOpsRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/headcount', headcountRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);

// Liveness: is this process up. Readiness (/api/ready): can it serve, i.e. is the database reachable.
app.get('/api/health', (req, res) => res.json({ status: 'online', uptime: Math.floor(process.uptime()) }));
app.get('/api/ready', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ready' });
    } catch (e) {
        res.status(503).json({ status: 'database unavailable' });
    }
});

app.use('/api', (req, res) => {
    res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.path}`, code: 'NOT_FOUND' });
});

// ---------------------------------------------------------------------------
// Frontend (built React app). Hashed assets cache for a year, entry files never cache.
// ---------------------------------------------------------------------------
const localDistPath = path.join(__dirname, 'dist');
const externalDistPath = path.join(__dirname, '../frontend/dist');
const frontendDistPath = fs.existsSync(localDistPath) ? localDistPath : externalDistPath;

const noCacheFiles = new Set(['index.html', 'sw.js', 'manifest.json']);
app.use(express.static(frontendDistPath, {
    index: false,
    setHeaders: (res, filePath) => {
        const name = path.basename(filePath);
        if (name === 'manifest.json') res.setHeader('Content-Type', 'application/manifest+json');
        if (name === 'sw.js') res.setHeader('Service-Worker-Allowed', '/');
        if (noCacheFiles.has(name)) res.setHeader('Cache-Control', 'no-cache');
        else if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        else res.setHeader('Cache-Control', 'public, max-age=86400');
    }
}));

app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => { if (err) next(); });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack || err.message);
    // Database pool full: tell the client to back off instead of failing in a confusing way.
    if (/Queue limit reached|ECONNREFUSED|PROTOCOL_CONNECTION_LOST/.test(err.message || '')) {
        res.setHeader('Retry-After', '3');
        return res.status(503).json({ error: 'The server is busy. Please try again in a moment.', code: 'BUSY' });
    }
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        error: status >= 500 && config.isProd ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
        code: err.code || 'SERVER_ERROR'
    });
});

// ---------------------------------------------------------------------------
// Process lifecycle: finish in-flight requests, then exit so PM2 or systemd can replace us.
// ---------------------------------------------------------------------------
const server = app.listen(config.port, () => {
    console.log(`AttendOTP worker ${process.pid} listening on ${config.port} (${config.isProd ? 'production' : 'development'})`);
    push.ensureTables()
        .then(() => push.startScheduler())
        .catch((e) => console.error('Doorbell setup failed:', e.message));
    if (process.send) process.send('ready'); // PM2 wait_ready
});
server.keepAliveTimeout = 65 * 1000; // longer than typical proxy idle timeouts
server.headersTimeout = 70 * 1000;

let shuttingDown = false;
const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, draining worker ${process.pid}`);
    server.close(async () => {
        try { await pool.end(); } catch (e) { /* ignore */ }
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 15000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception, restarting worker:', err);
    shutdown('uncaughtException');
});
