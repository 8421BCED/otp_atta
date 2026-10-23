const pool = require('./db');
const bcrypt = require('bcryptjs');

async function migrate() {
    try {
        console.log('--- Starting Migration for PT Staff & Sports OD Passes ---');

        // 1. Modify users.role to VARCHAR(50) to support 'pt'
        console.log('1. Updating users.role to VARCHAR(50)...');
        await pool.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'student'");

        // 2. Modify attendance_records.status to VARCHAR(50) to support 'od'
        console.log('2. Updating attendance_records.status to VARCHAR(50)...');
        await pool.query("ALTER TABLE attendance_records MODIFY COLUMN status VARCHAR(50) DEFAULT 'present'");

        // 3. Create sports_od_passes table
        console.log('3. Creating sports_od_passes table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sports_od_passes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_name VARCHAR(150) NOT NULL,
                sport_category VARCHAR(100) DEFAULT 'General Sports',
                venue VARCHAR(150) DEFAULT 'FXEC Sports Arena',
                from_date DATE NOT NULL,
                to_date DATE NOT NULL,
                is_all_day TINYINT(1) DEFAULT 1,
                from_period INT DEFAULT 1,
                to_period INT DEFAULT 7,
                reason TEXT NULL,
                created_by INT NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 4. Create sports_od_students table
        console.log('4. Creating sports_od_students table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sports_od_students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pass_id INT NOT NULL,
                student_id INT NOT NULL,
                notes VARCHAR(255) NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pass_id) REFERENCES sports_od_passes(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY uq_pass_student (pass_id, student_id)
            )
        `);

        // 5. Seed default PT Staff
        console.log('5. Ensuring default PT Staff exists...');
        const ptEmail = 'pe.director@francisxavier.ac.in';
        const [existing] = await pool.query('SELECT id, name, role FROM users WHERE email = ?', [ptEmail]);
        
        const ptPassHash = await bcrypt.hash('Password@123', 10);
        if (existing.length === 0) {
            await pool.query(`
                INSERT INTO users (name, email, password_hash, role, department, designation, phone, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `, [
                'Dr. K. Rathna Kumar',
                ptEmail,
                ptPassHash,
                'pt',
                'Sports & Physical Education',
                'DIRECTOR OF PHYSICAL EDUCATION',
                '9842100099'
            ]);
            console.log('✓ Created default PT Staff: Dr. K. Rathna Kumar (pe.director@francisxavier.ac.in)');
        } else {
            await pool.query(`
                UPDATE users 
                SET role = 'pt', department = 'Sports & Physical Education', designation = 'DIRECTOR OF PHYSICAL EDUCATION'
                WHERE email = ?
            `, [ptEmail]);
            console.log('✓ Updated existing PT Staff record to role = pt');
        }

        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('✗ Migration error:', err);
        process.exit(1);
    }
}

migrate();
