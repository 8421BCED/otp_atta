const pool = require('../db');

async function migrate() {
    console.log('Running staff movements migration...');
    await pool.query(`
        CREATE TABLE IF NOT EXISTS staff_movements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            staff_id INT NOT NULL,
            from_room_id INT NULL,
            to_room_id INT NOT NULL,
            period_id INT NOT NULL DEFAULT 1,
            date DATE NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            duration_minutes INT DEFAULT 0,
            note VARCHAR(255) NULL,
            KEY (staff_id),
            KEY (to_room_id),
            KEY (date),
            CONSTRAINT fk_sm_staff FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_sm_room FOREIGN KEY (to_room_id) REFERENCES rooms(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // Let's populate some realistic sample movements for Caroline (IT HOD) and a few staff for today and yesterday so calendar & history are rich and immediately visual!
    const [staff] = await pool.query("SELECT id, name, role, department FROM users WHERE role IN ('staff', 'hod') LIMIT 15");
    const [rooms] = await pool.query("SELECT id, room_number, name FROM rooms LIMIT 10");

    const today = new Date().toISOString().slice(0, 10);
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yesterday = yDate.toISOString().slice(0, 10);

    for (const s of staff) {
        const room1 = rooms[s.id % rooms.length].id;
        const room2 = rooms[(s.id + 2) % rooms.length].id;

        // Today movement
        await pool.query(`
            INSERT IGNORE INTO staff_movements (staff_id, to_room_id, period_id, date, timestamp, note)
            VALUES (?, ?, 1, ?, NOW(), 'Classroom Session / Lecture')
        `, [s.id, room1, today]);

        // Yesterday movement
        await pool.query(`
            INSERT IGNORE INTO staff_movements (staff_id, to_room_id, period_id, date, timestamp, note)
            VALUES (?, ?, 2, ?, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Laboratory / Department Lab Session')
        `, [s.id, room2, yesterday]);
    }

    console.log('✓ staff_movements table created and seeded with realistic live movements!');
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
