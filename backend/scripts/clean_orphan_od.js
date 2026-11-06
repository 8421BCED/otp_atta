const pool = require('../db');

async function cleanOrphanOD() {
    try {
        // Find attendance_records marked with status = 'od' where the student does NOT have an active pass or approved leave
        const [result] = await pool.query(`
            DELETE FROM attendance_records 
            WHERE status = 'od' 
              AND student_id NOT IN (
                  SELECT sos.student_id 
                  FROM sports_od_students sos 
                  JOIN sports_od_passes sop ON sos.pass_id = sop.id 
                  WHERE sop.status = 'active' OR sop.status = 'approved'
              )
              AND student_id NOT IN (
                  SELECT student_id 
                  FROM leave_applications 
                  WHERE status = 'approved'
              )
        `);
        console.log('✓ Successfully cleaned orphan OD records. Deleted rows:', result.affectedRows);
        process.exit(0);
    } catch (e) {
        console.error('Error cleaning orphan OD records:', e);
        process.exit(1);
    }
}

cleanOrphanOD();
