const express = require('express');
const cors = require('cors');
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
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static uploads serving (for 1-hr audited headcount photos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/principal', principalRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/it-ops', itOpsRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/headcount', headcountRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        institution: 'Francis Xavier Engineering College (Autonomous)',
        system: 'OTP Attendance & Real-Time Movement Tracking System',
        time: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 FXEC OTP Attendance Backend running on port ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
});
