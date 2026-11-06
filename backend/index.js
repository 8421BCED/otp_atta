const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

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
const PORT = process.env.PORT || 5000;

// Trust reverse proxies (Cloudflare, Nginx, Load Balancers)
app.set('trust proxy', 1);

// Production Security Headers with Google SSO popup allowance
app.use(helmet({
    contentSecurityPolicy: false, // Allows Vite HMR, Google SSO scripts, and assets
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false // Allows Google Identity Services popup to postMessage back to window.opener
}));

// Gzip Compression for all API JSON payloads (drastically cuts mobile network bandwidth)
app.use(compression({
    threshold: 1024, // Only compress responses above 1KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

// CORS Configuration for Production Domain & Local Development
const envCorsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : [];

const allowedOrigins = [
    'https://otpattendance.fxcams.in',
    'http://localhost:5000',
    'http://localhost:5173',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5173',
    ...envCorsOrigin
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow mobile webview, curl, server-to-server with no origin header
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.endsWith('.fxcams.in') || origin.endsWith('.trycloudflare.com')) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body Parsers
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static uploads serving (cached in production)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
    etag: true
}));

// Global Rate Limiter: Protects backend from DDoS / brute force while accommodating high student traffic
const globalApiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1200, // 1,200 requests/minute to smoothly handle 5-minute class change rushes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests from this device. Please wait a moment before trying again.',
        status: 429
    }
});
app.use('/api/', globalApiLimiter);

// Specific Auth Limiter: Prevents credential brute-forcing
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please try again shortly.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/demo-login', authLimiter);

// Mount API Routes
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

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        environment: process.env.NODE_ENV || 'production',
        institution: 'Francis Xavier Engineering College (Autonomous)',
        system: 'AttendOTP - Next-Gen Anti-Proxy Attendance System',
        memory: process.memoryUsage(),
        uptime: Math.floor(process.uptime()),
        time: new Date().toISOString()
    });
});

// Production Static Serving: Serve compiled React PWA frontend (checks backend/dist first)
const localDistPath = path.join(__dirname, 'dist');
const externalDistPath = path.join(__dirname, '../frontend/dist');
const frontendDistPath = fs.existsSync(localDistPath) ? localDistPath : externalDistPath;
app.use(express.static(frontendDistPath));

// Centralized 404 handler for unknown API routes
app.use('/api', (req, res) => {
    res.status(404).json({
        error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
        code: 'NOT_FOUND',
        status: 404
    });
});

// Centralized SPA Fallback: route any non-API GET request to index.html
app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
    }
    const indexPath = path.join(frontendDistPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) next();
    });
});

// Centralized Production Error Handler (prevents process crashing on unhandled route errors)
app.use((err, req, res, next) => {
    console.error('Unhandled API Error:', err.stack || err.message);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        code: err.code || 'SERVER_ERROR'
    });
});

// Graceful Process Lifecycle Handlers
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, () => {
    const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
    console.log(`====================================================`);
    console.log(`🚀 FXEC AttendOTP Production Server active on port ${PORT}`);
    console.log(`🌐 Public Domain: ${APP_URL}`);
    console.log(`📡 Health Check:  http://localhost:${PORT}/api/health`);
    console.log(`🛡️ Rate Limiting, Helmet Security & Gzip Compression active`);
    console.log(`====================================================`);
});
