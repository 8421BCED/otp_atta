const xlsx = require('xlsx');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seed() {
    const filePath = path.join(__dirname, '..', 'plans', 'alllistsstaff.xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet);

    console.log(`Read ${rawData.length} rows from alllistsstaff.xlsx`);

    const defaultPasswordHash = await bcrypt.hash('Fxec@123', 10);

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

    let principalCount = 0;
    let hodCount = 0;
    let staffCount = 0;

    for (const row of rawData) {
        const email = (row['Email *'] || '').trim().toLowerCase();
        if (!email || !email.includes('@')) continue;

        let name = (row['Name *'] || '').trim();
        // Clean name
        name = name.replace(/\s*-\s*PRINCIPAL/i, '')
                   .replace(/\s*-\s*HOD/i, '')
                   .replace(/\s*-\s*PROF\..*/i, '')
                   .trim();

        const role = getRole(row);
        const dept = getDepartment(row);

        if (role === 'principal') principalCount++;
        else if (role === 'hod') hodCount++;
        else staffCount++;

        // Upsert into users table
        await pool.query(
            `INSERT INTO users (name, email, password_hash, role, department, is_active)
             VALUES (?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE 
                name = VALUES(name),
                role = VALUES(role),
                department = VALUES(department)`,
            [name, email, defaultPasswordHash, role, dept]
        );
    }

    // Ensure our 4 core students exist
    const students = [
        { name: 'Daniel A', email: 'daniela.ug.24.it@francisxavier.ac.in', roll: '950724IT021', dept: 'IT', year: '2nd Year' },
        { name: 'Arun Kumar S', email: 'arun.ug.24.it@francisxavier.ac.in', roll: '950724IT005', dept: 'IT', year: '2nd Year' },
        { name: 'Kavitha M', email: 'kavitha.ug.24.it@francisxavier.ac.in', roll: '950724IT032', dept: 'IT', year: '2nd Year' },
        { name: 'Priya Dharshini R', email: 'priya.ug.24.it@francisxavier.ac.in', roll: '950724IT045', dept: 'IT', year: '2nd Year' }
    ];

    for (const s of students) {
        await pool.query(
            `INSERT INTO users (name, email, password_hash, role, department, roll_number, year_of_study, is_active)
             VALUES (?, ?, ?, 'student', ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE 
                name = VALUES(name),
                roll_number = VALUES(roll_number),
                year_of_study = VALUES(year_of_study)`,
            [s.name, s.email, defaultPasswordHash, s.dept, s.roll, s.year]
        );
    }

    console.log(`Seeding complete:`);
    console.log(`- Principals: ${principalCount}`);
    console.log(`- HODs: ${hodCount}`);
    console.log(`- Staff / Faculty: ${staffCount}`);
    console.log(`- Core Students: ${students.length}`);

    const [total] = await pool.query('SELECT COUNT(*) as count, role FROM users GROUP BY role');
    console.log('Database users by role:', total);

    process.exit(0);
}

seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
