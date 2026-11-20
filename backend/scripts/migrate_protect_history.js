// Makes the database itself refuse to delete a room or student that has attendance history.
// Before this, deleting a room silently deleted every attendance row recorded in it (ON DELETE CASCADE).
// Safe to run more than once. Changes constraints only, no rows are touched.
const pool = require('../db');

const TARGETS = [
    { table: 'attendance_records', column: 'room_id', ref: 'rooms' },
    { table: 'attendance_records', column: 'student_id', ref: 'users' },
    { table: 'student_movements', column: 'to_room_id', ref: 'rooms' },
    { table: 'staff_movements', column: 'to_room_id', ref: 'rooms' }
];

(async () => {
    try {
        for (const t of TARGETS) {
            const [fks] = await pool.query(
                `SELECT k.CONSTRAINT_NAME name, r.DELETE_RULE rule
                 FROM information_schema.KEY_COLUMN_USAGE k
                 JOIN information_schema.REFERENTIAL_CONSTRAINTS r
                   ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
                 WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = ? AND k.COLUMN_NAME = ? AND k.REFERENCED_TABLE_NAME = ?`,
                [t.table, t.column, t.ref]
            );
            if (fks.length === 0) { console.log(`- ${t.table}.${t.column}: no foreign key found, skipped`); continue; }
            if (fks.every((f) => f.rule === 'RESTRICT' || f.rule === 'NO ACTION')) { console.log(`= ${t.table}.${t.column}: already protected`); continue; }
            for (const fk of fks) await pool.query(`ALTER TABLE \`${t.table}\` DROP FOREIGN KEY \`${fk.name}\``);
            await pool.query(
                `ALTER TABLE \`${t.table}\` ADD CONSTRAINT \`fk_${t.table}_${t.column}\`
                 FOREIGN KEY (\`${t.column}\`) REFERENCES \`${t.ref}\` (id) ON DELETE RESTRICT`
            );
            console.log(`+ ${t.table}.${t.column}: now RESTRICT`);
        }
        console.log('Done. Rooms and students with history can no longer be deleted.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    }
})();
