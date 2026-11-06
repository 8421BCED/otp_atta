const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const DEPT_MAP = {
    '1': 'CIVIL',
    '2': 'CSE',
    '3': 'EEE',
    '4': 'ECE',
    '5': 'MECH',
    '6': 'IT',
    '7': 'MCA',
    '8': 'MBA',
    '10': 'LIB',
    '28': 'S&H',
    '153': 'Sports & Physical Education',
    '190': 'AI-DS',
    '191': 'CSBS',
    '194': 'AI-ML'
};

const DESIG_MAP = {
    '7': 'Assistant Professor',
    '8': 'Associate Professor',
    '11': 'Associate Professor',
    '28': 'Professor & HOD',
    '32': 'Physical Director',
    '33': 'Librarian',
    '36': 'Physical Director',
    '41': 'Principal',
    '42': 'Professor & Dean',
    '43': 'Professor',
    '71': 'Assistant Professor'
};

async function reseedStaff() {
    console.log('--- STARTING STAFF DATABASE RE-SEED ---');

    // 1. Clean out existing expired active_otps
    await pool.query('DELETE FROM active_otps');
    console.log('✓ Cleared active_otps table');

    // 2. Remove all old staff & hod records from users, preserving principal, students, and pt
    const [delResult] = await pool.query(
        "DELETE FROM users WHERE role IN ('staff', 'hod') AND email != 'principal@francisxavier.ac.in'"
    );
    console.log(`✓ Removed ${delResult.affectedRows} old staff/hod user accounts from database.`);

    // 3. Ensure Velmurugan is properly registered as Principal
    const defaultPasswordHash = await bcrypt.hash('Fxec@123', 10);
    await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, department, designation, is_active)
         VALUES (1, 'DR. VELMURUGAN V', 'principal@francisxavier.ac.in', ?, 'principal', 'ADMIN', 'PRINCIPAL', 1)
         ON DUPLICATE KEY UPDATE 
            name = 'DR. VELMURUGAN V',
            role = 'principal',
            department = 'ADMIN',
            designation = 'PRINCIPAL',
            is_active = 1`,
        [defaultPasswordHash]
    );
    console.log('✓ Principal Dr. V. Velmurugan verified.');

    // 4. Ensure students are preserved / active
    const coreStudents = [
        { name: 'Daniel A', email: 'daniela.ug.24.it@francisxavier.ac.in', dept: 'IT', year: '2nd Year', roll: '24IT001' },
        { name: 'Arun Kumar S', email: 'arun.ug.24.it@francisxavier.ac.in', dept: 'IT', year: '2nd Year', roll: '24IT002' },
        { name: 'Kavitha M', email: 'kavitha.ug.24.it@francisxavier.ac.in', dept: 'IT', year: '2nd Year', roll: '24IT003' },
        { name: 'Priya Dharshini R', email: 'priya.ug.24.it@francisxavier.ac.in', dept: 'IT', year: '2nd Year', roll: '24IT004' },
        { name: 'Siddharth M', email: 'siddharth.ug.24.cse@francisxavier.ac.in', dept: 'CSE', year: '2nd Year', roll: '24CS001' }
    ];

    for (const st of coreStudents) {
        await pool.query(
            `INSERT INTO users (name, email, password_hash, role, department, roll_number, year_of_study, is_active)
             VALUES (?, ?, ?, 'student', ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                role = 'student',
                department = VALUES(department),
                is_active = 1`,
            [st.name, st.email, defaultPasswordHash, st.dept, st.roll, st.year]
        );
    }
    console.log('✓ Students verified.');

    // 5. Read clean CSV
    const csvPath = path.join(__dirname, '..', 'plans', 'staffProf_cleaned.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    const header = lines[0].split(';');

    console.log(`\nReading ${lines.length - 1} records from ${csvPath}...`);

    let staffInserted = 0;
    let skippedPrincipal = 0;
    const seenEmails = new Set();
    seenEmails.add('principal@francisxavier.ac.in');

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(';');
        const staffCode = row[0].trim();
        const rawName = row[3].trim().toUpperCase();
        const personalMail = row[5].trim().toLowerCase();
        const desigId = row[12].trim();
        const deptId = row[13].trim();
        const phone = row[24].trim();
        let officialMail = row[30].trim().toLowerCase();

        // Check if this is Velmurugan (Principal)
        if (staffCode === 'FXMET019' || officialMail === 'velmurugan@francisxavier.ac.in' || rawName.includes('VELMURUGAN V')) {
            skippedPrincipal++;
            continue;
        }

        // Handle duplicate official email if any (e.g. pd@francisxavier.ac.in)
        if (!officialMail || officialMail === '' || seenEmails.has(officialMail)) {
            if (personalMail && personalMail.includes('@') && !seenEmails.has(personalMail)) {
                officialMail = personalMail;
            } else {
                officialMail = `${staffCode.toLowerCase()}@francisxavier.ac.in`;
            }
        }
        seenEmails.add(officialMail);

        const department = DEPT_MAP[deptId] || 'IT';
        const designation = DESIG_MAP[desigId] || 'Assistant Professor';

        // All users default to 'staff' as requested by the user, so they can easily edit HODs via /strange
        const role = 'staff';

        await pool.query(
            `INSERT INTO users (name, email, password_hash, role, department, designation, roll_number, phone, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                role = VALUES(role),
                department = VALUES(department),
                designation = VALUES(designation),
                roll_number = VALUES(roll_number),
                phone = VALUES(phone),
                is_active = 1`,
            [rawName, officialMail, defaultPasswordHash, role, department, designation, staffCode, phone || null]
        );

        staffInserted++;
    }

    console.log(`\n✓ Successfully inserted/seeded ${staffInserted} staff members!`);
    console.log(`✓ Skipped ${skippedPrincipal} Principal record (already assigned role='principal').`);

    // Verify roles breakdown
    const [summary] = await pool.query('SELECT role, count(*) as count FROM users GROUP BY role ORDER BY count DESC');
    console.log('\n--- CURRENT DATABASE USERS BY ROLE ---');
    console.table(summary);

    process.exit(0);
}

reseedStaff().catch(err => {
    console.error('Error during reseeding:', err);
    process.exit(1);
});
