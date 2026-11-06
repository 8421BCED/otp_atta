const pool = require('../db');

async function unlockDaniel() {
    try {
        const [users] = await pool.query("SELECT id, name, email FROM users WHERE email LIKE 'daniela%'");
        console.log('Daniel users found:', users);

        for (const u of users) {
            // Check device lock
            const [devLocks] = await pool.query("SELECT * FROM device_locks WHERE user_id = ?", [u.id]);
            console.log(`Device locks for ${u.name} (${u.email}):`, devLocks);

            // Reset / delete device locks so mobile device binds cleanly
            await pool.query("DELETE FROM device_locks WHERE user_id = ?", [u.id]);
            console.log(`✓ Cleared device locks for user ID ${u.id}`);

            // Clear any day lockouts
            await pool.query("DELETE FROM student_day_locks WHERE student_id = ?", [u.id]);
            console.log(`✓ Cleared student_day_locks for user ID ${u.id}`);
        }

        console.log('ALL LOCKS REMOVED FOR DANIEL! Ready to test on mobile.');
        process.exit(0);
    } catch (e) {
        console.error('Error unlocking Daniel:', e);
        process.exit(1);
    }
}

unlockDaniel();
