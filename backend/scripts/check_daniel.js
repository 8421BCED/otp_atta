const pool = require('../db');

async function checkDaniel() {
    try {
        const [users] = await pool.query("SELECT id, name, email, is_locked, device_id, device_name FROM users WHERE email LIKE 'daniela%'");
        console.log('User status:', users);

        const today = new Date().toISOString().slice(0, 10);
        const [locks] = await pool.query("SELECT * FROM student_day_locks WHERE student_id IN (?)", [users.map(u => u.id)]);
        console.log('Day locks:', locks);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkDaniel();
