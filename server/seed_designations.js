const xlsx = require('c:/Users/0dani/Desktop/otp_att/server/node_modules/xlsx');
const bcrypt = require('c:/Users/0dani/Desktop/otp_att/server/node_modules/bcryptjs');
const pool = require('c:/Users/0dani/Desktop/otp_att/server/db');

async function main() {
    // 1. Add designation column if not exists
    try {
        await pool.query('ALTER TABLE users ADD COLUMN designation VARCHAR(100) NULL AFTER department');
        console.log('Added designation column to users table');
    } catch (e) {
        if (!e.message.includes('Duplicate column name')) {
            console.log('Note on column:', e.message);
        }
    }

    // 2. Read xlsx and update users
    const filePath = 'c:/Users/0dani/Desktop/otp_att/plans/alllistsstaff.xlsx';
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet);

    function getDepartment(row) {
        const rep = (row['Reporting Manager Email (Optional)'] || '').toLowerCase();
        const name = (row['Name *'] || '').toUpperCase();
        const email = (row['Email *'] || '').toLowerCase();
        const desig = (row['Designation (Optional)'] || '').toUpperCase();

        if (email === 'principal@francisxavier.ac.in' || desig.includes('PRINCIPAL') || name.includes('PRINCIPAL')) {
            return 'ADMIN';
        }
        if (rep.includes('ithod') || email.includes('ithod') || email.includes('.it@')) return 'IT';
        if (rep.includes('csehod') || email.includes('csehod') || email.includes('.cse@')) return 'CSE';
        if (rep.includes('ecehod') || email.includes('ecehod') || email.includes('.ece@')) return 'ECE';
        if (rep.includes('eeehod') || email.includes('eeehod') || email.includes('.eee@')) return 'EEE';
        if (rep.includes('mechhod') || email.includes('mechhod') || email.includes('.mech@')) return 'MECH';
        if (rep.includes('civilhod') || email.includes('civilhod') || email.includes('.civil@')) return 'CIVIL';
        if (rep.includes('aihod') || email.includes('aihod') || email.includes('.ai@') || email.includes('.aids@')) return 'AI-DS';
        if (rep.includes('csbshod') || email.includes('csbshod') || email.includes('.csbs@')) return 'CSBS';
        if (rep.includes('mbahod') || email.includes('mbahod') || email.includes('.mba@')) return 'MBA';
        if (rep.includes('mcahod') || email.includes('mcahod') || email.includes('.mca@')) return 'MCA';
        if (rep.includes('ic.daniel')) return 'IT';
        return 'IT';
    }

    function getRole(row) {
        const email = (row['Email *'] || '').toLowerCase().trim();
        const name = (row['Name *'] || '').toUpperCase();
        const desig = (row['Designation (Optional)'] || '').toUpperCase();
        const subtype = (row['Subtype *'] || '').toUpperCase();

        if (email === 'principal@francisxavier.ac.in' || desig.includes('PRINCIPAL') || name.includes('PRINCIPAL')) {
            return 'principal';
        }
        if (subtype.includes('HOD') || desig.includes('HOD') || email.includes('hod@') || name.startsWith('HOD-')) {
            return 'hod';
        }
        return 'staff';
    }

    const defaultPasswordHash = await bcrypt.hash('Fxec@123', 10);

    let updatedCount = 0;
    for (const row of rawData) {
        const email = (row['Email *'] || '').trim().toLowerCase();
        if (!email || !email.includes('@')) continue;

        let name = (row['Name *'] || '').trim();
        name = name.replace(/\s*-\s*PRINCIPAL/i, '')
                   .replace(/\s*-\s*HOD/i, '')
                   .replace(/\s*-\s*PROF\..*/i, '')
                   .trim();

        const role = getRole(row);
        const dept = getDepartment(row);
        const desig = (row['Designation (Optional)'] || '').trim();

        await pool.query(
            `INSERT INTO users (name, email, password_hash, role, department, designation, is_active)
             VALUES (?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE 
                name = VALUES(name),
                role = VALUES(role),
                department = VALUES(department),
                designation = VALUES(designation)`,
            [name, email, defaultPasswordHash, role, dept, desig]
        );
        updatedCount++;
    }

    console.log(`Seeded & updated ${updatedCount} staff/hod/principal users with department & designation`);

    // Verify Aruna Devi in IT and Aruna in CSE
    const [arunas] = await pool.query('SELECT id, name, email, role, department, designation FROM users WHERE name LIKE "%ARUNADEVI%" OR email LIKE "%aruna%"');
    console.log('Aruna records in DB:');
    console.log(JSON.stringify(arunas, null, 2));

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
