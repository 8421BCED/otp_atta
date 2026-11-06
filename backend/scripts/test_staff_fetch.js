const pool = require('../db');
const jwt = require('jsonwebtoken');

async function testFetch() {
    // Generate valid principal token
    const token = jwt.sign(
        { id: 1, email: 'principal@francisxavier.ac.in', role: 'principal' },
        'francis_xavier_engineering_college_otp_attendance_secret_key_2026',
        { expiresIn: '1d' }
    );

    const url = 'http://localhost:5000/api/principal/staffs?q=&department=IT&role=all';
    console.log('Testing GET:', url);

    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data returned staffs count:', data.staffs ? data.staffs.length : data);
    if (data.staffs && data.staffs.length > 0) {
        console.log('Sample staff:', data.staffs.slice(0, 3));
    }
    process.exit(0);
}

testFetch().catch(err => {
    console.error('Fetch error:', err);
    process.exit(1);
});
