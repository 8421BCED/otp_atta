const pool = require('../db');

async function inspectOD() {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const [passes] = await pool.query('SELECT * FROM sports_od_passes');
        console.log('sports_od_passes count:', passes.length);
        console.log(passes);

        const [odRecords] = await pool.query("SELECT * FROM attendance_records WHERE status = 'od'");
        console.log('OD attendance_records count:', odRecords.length);
        console.log(odRecords);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

inspectOD();
