const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/location');
const attendanceRoutes = require('./routes/attendance');
const hodRoutes = require('./routes/hod');
const principalRoutes = require('./routes/principal');
const holidayRoutes = require('./routes/holidays');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/principal', principalRoutes);
app.use('/api/holidays', holidayRoutes);

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
