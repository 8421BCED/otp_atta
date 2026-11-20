// Removes On-Duty attendance rows that no longer belong to any pass or approved leave.
// Dry run by default: it only counts. Add --apply to actually delete.
const pool = require('../db');

const WHERE = `
    status = 'od'
    AND student_id NOT IN (
        SELECT sos.student_id FROM sports_od_students sos
        JOIN sports_od_passes sop ON sos.pass_id = sop.id
        WHERE sop.status = 'active' OR sop.status = 'approved'
    )
    AND student_id NOT IN (SELECT student_id FROM leave_applications WHERE status = 'approved')`;

(async () => {
    try {
        const apply = process.argv.includes('--apply');
        const [[{ n }]] = await pool.query(`SELECT COUNT(*) n FROM attendance_records WHERE ${WHERE}`);
        console.log(`${n} orphan On-Duty rows found.`);
        if (!apply) {
            console.log('Dry run, nothing deleted. Re-run with --apply to delete them.');
        } else {
            const [r] = await pool.query(`DELETE FROM attendance_records WHERE ${WHERE}`);
            console.log('Deleted rows:', r.affectedRows);
        }
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
