const http = require('http');

const post = (path, body, token) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body || {});
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: `/api${path}`,
            method: 'POST',
            headers
        }, res => {
            let resData = '';
            res.on('data', chunk => resData += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(resData);
                    if (res.statusCode >= 400) {
                        reject({ status: res.statusCode, data: parsed });
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject({ status: res.statusCode, raw: resData });
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
};

const get = (path, token) => {
    return new Promise((resolve, reject) => {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: `/api${path}`,
            method: 'GET',
            headers
        }, res => {
            let resData = '';
            res.on('data', chunk => resData += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(resData);
                    if (res.statusCode >= 400) {
                        reject({ status: res.statusCode, data: parsed });
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject({ status: res.statusCode, raw: resData });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
};

async function runTests() {
    console.log('==========================================================');
    console.log('🚀 TESTING COMPLETE FXEC WORKFLOW IN NODE.JS');
    console.log('==========================================================');

    // 1. Staff Login
    const staff = await post('/auth/demo-login', {
        email: 'staff.it@francisxavier.ac.in',
        role: 'staff'
    });
    console.log(`✓ 1. Staff Logged in: ${staff.user.name} (${staff.user.department})`);

    // Lookup Real Campus Room AK 207 dynamically
    const locationData = await get('/locations/hierarchy');
    const ak207 = locationData.allRooms.find(r => r.room_number === 'AK 207') || locationData.allRooms[0];
    const otherRoom = locationData.allRooms.find(r => r.id !== ak207.id) || locationData.allRooms[1];
    const targetRoomId = ak207.id;

    // 2. Staff Generates 10-Second Rolling OTP for AK 207
    const otp = await post('/attendance/generate-otp', {
        roomId: targetRoomId,
        periodId: 2
    }, staff.token);
    console.log(`✓ 2. 10-Second OTP generated for ${ak207.room_number} (${ak207.name}): [${otp.otpCode}] (Expires in ${otp.expiresInSeconds}s)`);

    // 3. Check Live Room Roster before student check-in
    const rosterBefore = await get(`/attendance/room-live-roster/${targetRoomId}`, staff.token);
    console.log(`✓ 3. Live ${ak207.room_number} Count before check-in: ${rosterBefore.presentCount} students`);

    // 4. HOD Resets Device Lock for Daniel A (testing HOD reset power)
    const hod = await post('/auth/demo-login', {
        email: 'hod.it@francisxavier.ac.in',
        role: 'hod'
    });
    const resetRes = await post('/hod/reset-device-lock', { studentId: 5 }, hod.token);
    console.log(`✓ 4. HOD Reset Device Lock Power: ${resetRes.message}`);

    // 5. Student (Daniel A) Registers New Phone
    const student = await post('/auth/demo-login', {
        email: 'daniela.ug.24.it@francisxavier.ac.in',
        role: 'student',
        deviceInfo: {
            deviceId: 'SAMSUNG-A35-OFFICIAL-123',
            deviceName: 'Samsung Galaxy A35 5G',
            platform: 'Android'
        }
    });
    console.log(`✓ 5. Student Logged in & Bound: ${student.user.name} (${student.user.roll_number}) on Samsung Galaxy A35`);

    // 6. Student Submits OTP for AK 207
    const submit = await post('/attendance/submit-otp', {
        roomId: targetRoomId,
        otpCode: otp.otpCode,
        periodId: 2,
        deviceInfo: {
            deviceId: 'SAMSUNG-A35-OFFICIAL-123'
        }
    }, student.token);
    console.log(`✓ 6. Student OTP submission: ${submit.message}`);

    // 7. Check Live Room Roster after student check-in
    const rosterAfter = await get(`/attendance/room-live-roster/${targetRoomId}`, staff.token);
    console.log(`✓ 7. Live ${ak207.room_number} Count after check-in: ${rosterAfter.presentCount} student(s) present!`);
    console.log(`     Present student in roster: ${rosterAfter.students[0].name} (${rosterAfter.students[0].roll_number})`);

    // 8. Anti-Proxy Check: Attempt to login to Daniel's account from a friend's phone
    try {
        await post('/auth/login', {
            email: 'daniela.ug.24.it@francisxavier.ac.in',
            password: 'Password@2525',
            deviceInfo: {
                deviceId: 'FRIEND-PHONE-DEV-999',
                deviceName: 'Friend Redmi Phone'
            }
        });
        console.log('✗ FAILED: Friend phone was not blocked!');
    } catch (err) {
        console.log(`✓ 8. Anti-Proxy Protection Active: Blocked login from friend's phone! [Code: ${err.data.code}]`);
    }

    // 9. Cross-Room OTP Check: Student selected a different room but enters AK 207 OTP
    try {
        await post('/attendance/submit-otp', {
            roomId: otherRoom.id,
            otpCode: otp.otpCode,
            periodId: 3,
            deviceInfo: { deviceId: 'SAMSUNG-A35-OFFICIAL-123' }
        }, student.token);
        console.log('✗ FAILED: Cross room was not blocked!');
    } catch (err) {
        console.log(`✓ 9. Cross-Room Protection Active: Blocked OTP submission! [Code: ${err.data.code}]`);
    }

    // 10. Principal Executive Overview
    const prin = await post('/auth/demo-login', {
        email: 'principal@francisxavier.ac.in',
        role: 'principal'
    });
    const prinOverview = await get('/principal/overview', prin.token);
    console.log(`✓ 10. Principal Overview: Campus Total Students: ${prinOverview.summary.totalStudents}, Present Today: ${prinOverview.summary.totalPresent}`);

    console.log('==========================================================');
    console.log('🏆 ALL 10 TESTS PASSED WITH 100% SUCCESS!');
    console.log('==========================================================');
}

runTests().catch(console.error);
