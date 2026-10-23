const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function seedCollegeRooms() {
    console.log('========================================================');
    console.log('🏛️  Seeding Official FXEC Campus Buildings, Floors & Rooms');
    console.log('========================================================\n');

    try {
        // 1. Ensure rooms.room_type can store descriptive room types (lab, workshop, office, etc.)
        await pool.query("ALTER TABLE rooms MODIFY COLUMN room_type VARCHAR(50) DEFAULT 'classroom'");
        console.log('✓ Verified rooms.room_type column');

        // 2. Temporarily disable foreign key checks to safely clear old mock location records
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        await pool.query('DELETE FROM active_otps');
        await pool.query('DELETE FROM student_movements');
        await pool.query('DELETE FROM attendance_records');
        await pool.query('DELETE FROM rooms');
        await pool.query('DELETE FROM floors');
        await pool.query('DELETE FROM buildings');
        await pool.query('ALTER TABLE buildings AUTO_INCREMENT = 1');
        await pool.query('ALTER TABLE floors AUTO_INCREMENT = 1');
        await pool.query('ALTER TABLE rooms AUTO_INCREMENT = 1');
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✓ Cleared previous mock buildings, floors, and rooms');

        // 3. Define Official College Buildings
        const buildingsData = [
            {
                name: 'Dr. APJ Abdul Kalam Block',
                code: 'APJ',
                description: 'Advanced Computing, Applied Labs, IT & AI-ML Department Wings'
            },
            {
                name: 'FX Engineering Block',
                code: 'FXB',
                description: 'Administrative, Placement, Research Labs, ECE & CSE Department Wings'
            },
            {
                name: 'Mechanical Engineering Block',
                code: 'MEB',
                description: 'Mechanical, Robotics, Workshops, Machines & Applied Engineering Labs'
            },
            {
                name: 'Central Library Block',
                code: 'LIB',
                description: 'Central Campus Library, Fitness Gym, MCA Labs & Mobile App Labs'
            },
            {
                name: 'Department of MBA Block',
                code: 'MBA',
                description: 'Management Studies, Seminar Halls, Executive Classrooms & Library'
            },
            {
                name: 'Campus Facilities & Amenities',
                code: 'FAC',
                description: 'Main Auditorium, Campus Food Court & Canteen'
            }
        ];

        const buildingMap = {};
        for (const b of buildingsData) {
            const [res] = await pool.query(
                'INSERT INTO buildings (name, code, description) VALUES (?, ?, ?)',
                [b.name, b.code, b.description]
            );
            buildingMap[b.code] = res.insertId;
        }
        console.log(`✓ Inserted ${Object.keys(buildingMap).length} Campus Buildings`);

        // 4. Define Floors for Each Building
        const floorsData = [
            // APJ Block
            { bCode: 'APJ', num: 0, name: 'Ground Floor' },
            { bCode: 'APJ', num: 1, name: 'First Floor' },
            { bCode: 'APJ', num: 2, name: 'Second Floor' },
            { bCode: 'APJ', num: 3, name: 'Third Floor' },

            // FX Block
            { bCode: 'FXB', num: 0, name: 'Ground Floor' },
            { bCode: 'FXB', num: 1, name: 'First Floor' },
            { bCode: 'FXB', num: 2, name: 'Second Floor' },
            { bCode: 'FXB', num: 3, name: 'Third Floor' },

            // Mechanical Block
            { bCode: 'MEB', num: 0, name: 'Ground Floor' },
            { bCode: 'MEB', num: 1, name: 'First Floor' },
            { bCode: 'MEB', num: 2, name: 'Second Floor' },
            { bCode: 'MEB', num: 3, name: 'Third Floor' },

            // Library Block
            { bCode: 'LIB', num: 0, name: 'Ground Floor' },
            { bCode: 'LIB', num: 2, name: 'Second Floor' },
            { bCode: 'LIB', num: 3, name: 'Third Floor' },

            // MBA Block
            { bCode: 'MBA', num: 0, name: 'Ground Floor' },
            { bCode: 'MBA', num: 1, name: 'First Floor' },
            { bCode: 'MBA', num: 2, name: 'Second Floor' },

            // Campus Facilities
            { bCode: 'FAC', num: 0, name: 'Ground Floor' }
        ];

        const floorMap = {};
        for (const f of floorsData) {
            const bId = buildingMap[f.bCode];
            const [res] = await pool.query(
                'INSERT INTO floors (building_id, floor_number, name) VALUES (?, ?, ?)',
                [bId, f.num, f.name]
            );
            floorMap[`${f.bCode}_${f.num}`] = res.insertId;
        }
        console.log(`✓ Inserted ${Object.keys(floorMap).length} Campus Floors`);

        // 5. Define All Official Rooms from Handwritten Notes
        const roomsData = [
            // ==================== APJ BLOCK ====================
            // Ground Floor
            { b: 'APJ', f: 0, num: 'AK 001', name: 'Dispensary (Health Centre)', type: 'medical', cap: 20, dept: 'ALL' },
            { b: 'APJ', f: 0, num: 'AK 002', name: 'APJ Auditorium', type: 'auditorium', cap: 350, dept: 'ALL' },
            { b: 'APJ', f: 0, num: 'AK 003', name: 'Lecture Hall AK 003', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 0, num: 'AK 005', name: 'Lecture Hall AK 005', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 0, num: 'AK 006', name: 'Environmental Lab (DST-FIST Supported)', type: 'lab', cap: 45, dept: 'ALL' },
            { b: 'APJ', f: 0, num: 'AK 007', name: 'Applied Lab', type: 'lab', cap: 50, dept: 'ALL' },
            { b: 'APJ', f: 0, num: 'AK 008', name: 'Cyber Forensics Lab', type: 'lab', cap: 60, dept: 'IT' },
            { b: 'APJ', f: 0, num: 'AK 009', name: 'Prayer Hall', type: 'facility', cap: 40, dept: 'ALL' },
            { b: 'APJ', f: 0, num: 'AK 010', name: 'Lecture Hall AK 010', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 0, num: 'CRD', name: 'Centre for Research & Development', type: 'research', cap: 35, dept: 'ALL' },

            // First Floor
            { b: 'APJ', f: 1, num: 'AK 101', name: 'Lecture Hall AK 101', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 1, num: 'AK 102', name: 'Data Science Applied Lab', type: 'lab', cap: 65, dept: 'AI-DS' },
            { b: 'APJ', f: 1, num: 'AK 103', name: 'Project Lab', type: 'lab', cap: 50, dept: 'ALL' },
            { b: 'APJ', f: 1, num: 'AK 104', name: 'Architecture and Design Applied Lab', type: 'lab', cap: 50, dept: 'ALL' },
            { b: 'APJ', f: 1, num: 'AK 105', name: 'Lecture Hall AK 105', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 1, num: 'AK 106', name: 'Lecture Hall AK 106', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 1, num: 'AK 107', name: 'Lecture Hall AK 107', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 1, num: 'AK 109', name: 'Lecture Hall AK 109', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 1, num: 'AK 110', name: 'Lecture Hall AK 110', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 1, num: 'AK 111', name: 'HOD AI-ML Office / Classroom', type: 'office', cap: 40, dept: 'AI-ML' },
            { b: 'APJ', f: 1, num: 'AK 112', name: 'Entrepreneurship Development Cell (EDC)', type: 'office', cap: 30, dept: 'ALL' },
            { b: 'APJ', f: 1, num: 'AK 113', name: 'Staff Room (Faculty Room 1)', type: 'staff_room', cap: 25, dept: 'ALL' },
            { b: 'APJ', f: 1, num: 'AK 114', name: 'Staff Room (Faculty Room 2)', type: 'staff_room', cap: 25, dept: 'ALL' },

            // Second Floor
            { b: 'APJ', f: 2, num: 'AK 201', name: 'Lecture Hall AK 201', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 2, num: 'AK 202', name: 'Lecture Hall AK 202', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 2, num: 'AK 203', name: 'Lecture Hall AK 203', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 2, num: 'AK 204', name: 'Lecture Hall AK 204', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 2, num: 'AK 205', name: 'Lecture Hall AK 205', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 2, num: 'AK 206', name: 'Lecture Hall AK 206', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 2, num: 'IT-SR1', name: 'IT Staff Room - I', type: 'staff_room', cap: 20, dept: 'IT' },
            { b: 'APJ', f: 2, num: 'AK 207', name: 'IT 2nd Year Lecture Hall (Room 207)', type: 'classroom', cap: 70, dept: 'IT' },
            { b: 'APJ', f: 2, num: 'AK 208', name: 'Lecture Hall AK 208', type: 'classroom', cap: 65, dept: 'IT' },
            { b: 'APJ', f: 2, num: 'AK 209', name: 'IT Staff Room - II', type: 'staff_room', cap: 20, dept: 'IT' },
            { b: 'APJ', f: 2, num: 'AK 210', name: 'IT HOD Room', type: 'office', cap: 15, dept: 'IT' },
            { b: 'APJ', f: 2, num: 'AK 211', name: 'IT Staff Room - III', type: 'staff_room', cap: 20, dept: 'IT' },

            // Third Floor
            { b: 'APJ', f: 3, num: 'AK 301', name: 'IT Staff Room - IV', type: 'staff_room', cap: 20, dept: 'IT' },
            { b: 'APJ', f: 3, num: 'AK 302', name: 'Lecture Hall AK 302', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 3, num: 'AK 303', name: 'Lecture Hall AK 303', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 3, num: 'AK 304', name: 'Lecture Hall AK 304', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 3, num: 'AK 305', name: 'IT Department Library', type: 'library', cap: 40, dept: 'IT' },
            { b: 'APJ', f: 3, num: 'AK 306', name: 'Physics Lab', type: 'lab', cap: 60, dept: 'S&H' },
            { b: 'APJ', f: 3, num: 'AK 307', name: 'Lecture Hall AK 307', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 3, num: 'AK 308', name: 'Chemistry Lab', type: 'lab', cap: 60, dept: 'S&H' },
            { b: 'APJ', f: 3, num: 'AK 309', name: 'Lecture Hall AK 309', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 3, num: 'AK 310', name: 'Lecture Hall AK 310', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 3, num: 'AK 311', name: 'Lecture Hall AK 311', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 3, num: 'AK 312', name: 'Lecture Hall AK 312', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 3, num: 'AK 313', name: 'Lecture Hall AK 313', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'APJ', f: 3, num: 'NSS', name: 'NSS Cell (Service Organizations)', type: 'office', cap: 25, dept: 'ALL' },

            // ==================== FX BLOCK ====================
            // Ground Floor
            { b: 'FXB', f: 0, num: 'FX-PH', name: 'Presentation Hall', type: 'seminar_hall', cap: 150, dept: 'ALL' },
            { b: 'FXB', f: 0, num: 'FX 002', name: 'Electrical Store Room', type: 'store_room', cap: 10, dept: 'EEE' },
            { b: 'FXB', f: 0, num: 'FX-DSL', name: 'Data Science Lab', type: 'lab', cap: 60, dept: 'AI-DS' },
            { b: 'FXB', f: 0, num: 'FX-SH', name: 'Seminar Hall (FX Ground)', type: 'seminar_hall', cap: 200, dept: 'ALL' },
            { b: 'FXB', f: 0, num: 'FX-ARVR', name: 'Augmented Reality and Virtual Reality Lab', type: 'lab', cap: 50, dept: 'CSE' },
            { b: 'FXB', f: 0, num: 'FX-AA', name: 'Alumni Association Office', type: 'office', cap: 20, dept: 'ALL' },
            { b: 'FXB', f: 0, num: 'FX-NGC', name: 'Next Generation Computing Lab', type: 'lab', cap: 60, dept: 'CSE' },
            { b: 'FXB', f: 0, num: 'FX 008', name: 'Administrative Office (FX 008)', type: 'office', cap: 30, dept: 'ALL' },
            { b: 'FXB', f: 0, num: 'FX 009', name: 'Lecture Hall FX 009', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'FXB', f: 0, num: 'FX 010', name: 'Lecture Hall FX 010', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'FXB', f: 0, num: 'FX-CC', name: "Chairman's Chamber", type: 'office', cap: 20, dept: 'ADMIN' },
            { b: 'FXB', f: 0, num: 'FX 012', name: 'Accounts Section', type: 'office', cap: 25, dept: 'ADMIN' },
            { b: 'FXB', f: 0, num: 'FX 013', name: 'Group Discussion Hall', type: 'seminar_hall', cap: 60, dept: 'PLACEMENT' },
            { b: 'FXB', f: 0, num: 'FX 014', name: 'Centre for Training and Placement', type: 'office', cap: 40, dept: 'PLACEMENT' },

            // First Floor
            { b: 'FXB', f: 1, num: 'FX-SR', name: 'Surveillance Room (CCTV Control)', type: 'utility', cap: 15, dept: 'SECURITY' },
            { b: 'FXB', f: 1, num: 'FX 101', name: 'Lecture Hall FX 101', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'FXB', f: 1, num: 'FX 102', name: 'DSP Lab (Digital Signal Processing)', type: 'lab', cap: 60, dept: 'ECE' },
            { b: 'FXB', f: 1, num: 'FX 103', name: 'VLSI Lab', type: 'lab', cap: 60, dept: 'ECE' },
            { b: 'FXB', f: 1, num: 'FX 104', name: 'Network Lab', type: 'lab', cap: 60, dept: 'IT' },
            { b: 'FXB', f: 1, num: 'FX 105', name: 'OS Lab [IT L02]', type: 'lab', cap: 60, dept: 'IT' },
            { b: 'FXB', f: 1, num: 'FX 106', name: 'Research Lab [IT L01]', type: 'lab', cap: 60, dept: 'IT' },
            { b: 'FXB', f: 1, num: 'FX 107', name: 'UPS Room', type: 'utility', cap: 10, dept: 'ALL' },
            { b: 'FXB', f: 1, num: 'FX 108', name: 'Lecture Hall FX 108', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'FXB', f: 1, num: 'FX 109', name: 'Lecture Hall FX 109', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'FXB', f: 1, num: 'FX 110', name: 'Lecture Hall FX 110', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'FXB', f: 1, num: 'FX 111', name: 'Lecture Hall FX 111', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'FXB', f: 1, num: 'FX 112', name: 'Lecture Hall FX 112', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'FXB', f: 1, num: 'FX 113', name: 'Lecture Hall FX 113', type: 'classroom', cap: 65, dept: 'ALL' },

            // Second Floor
            { b: 'FXB', f: 2, num: 'FX 201', name: 'Innovation Lab (FX 201)', type: 'lab', cap: 50, dept: 'ECE' },
            { b: 'FXB', f: 2, num: 'FX 202', name: 'Lecture Hall FX 202', type: 'classroom', cap: 65, dept: 'ECE' },
            { b: 'FXB', f: 2, num: 'FX 203', name: 'Lecture Hall FX 203', type: 'classroom', cap: 65, dept: 'ECE' },
            { b: 'FXB', f: 2, num: 'FX 204', name: 'Lecture Hall FX 204', type: 'classroom', cap: 65, dept: 'ECE' },
            { b: 'FXB', f: 2, num: 'FX 205', name: 'ECE Department Library', type: 'library', cap: 40, dept: 'ECE' },
            { b: 'FXB', f: 2, num: 'FX 206', name: 'Lecture Hall FX 206', type: 'classroom', cap: 65, dept: 'ECE' },
            { b: 'FXB', f: 2, num: 'FX 207', name: 'Centre for International Relations', type: 'office', cap: 25, dept: 'ALL' },
            { b: 'FXB', f: 2, num: 'FX 208', name: 'ECE Staff Room', type: 'staff_room', cap: 30, dept: 'ECE' },
            { b: 'FXB', f: 2, num: 'FX 209', name: 'Lecture Hall FX 209', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'FXB', f: 2, num: 'FX 210', name: 'Lecture Hall FX 210', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'FXB', f: 2, num: 'FX 211', name: 'Lecture Hall FX 211', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'FXB', f: 2, num: 'FX 212', name: 'Staff Room (FX 212)', type: 'staff_room', cap: 25, dept: 'ALL' },
            { b: 'FXB', f: 2, num: 'FX 213', name: 'Lecture Hall FX 213', type: 'classroom', cap: 65, dept: 'ALL' },
            { b: 'FXB', f: 2, num: 'FX 215', name: 'Lecture Hall FX 215', type: 'classroom', cap: 65, dept: 'ALL' },

            // Third Floor
            { b: 'FXB', f: 3, num: 'FX 302', name: 'Lecture Hall FX 302', type: 'classroom', cap: 65, dept: 'CSE' },
            { b: 'FXB', f: 3, num: 'FX 303', name: 'Lecture Hall FX 303', type: 'classroom', cap: 65, dept: 'CSE' },
            { b: 'FXB', f: 3, num: 'FX 304', name: 'Lecture Hall FX 304', type: 'classroom', cap: 65, dept: 'CSE' },
            { b: 'FXB', f: 3, num: 'FX 305', name: 'Lecture Hall FX 305', type: 'classroom', cap: 65, dept: 'CSE' },
            { b: 'FXB', f: 3, num: 'FX 306', name: 'Electronic Devices Lab', type: 'lab', cap: 60, dept: 'ECE' },
            { b: 'FXB', f: 3, num: 'FX 307', name: 'Lecture Hall FX 307', type: 'classroom', cap: 65, dept: 'CSE' },
            { b: 'FXB', f: 3, num: 'FX 308', name: 'Microwave Lab', type: 'lab', cap: 55, dept: 'ECE' },
            { b: 'FXB', f: 3, num: 'FX-CSEL', name: 'CSE Department Library', type: 'library', cap: 40, dept: 'CSE' },
            { b: 'FXB', f: 3, num: 'FX 310', name: 'Lecture Hall FX 310', type: 'classroom', cap: 65, dept: 'CSE' },
            { b: 'FXB', f: 3, num: 'FX 311', name: 'Lecture Hall FX 311', type: 'classroom', cap: 65, dept: 'CSE' },
            { b: 'FXB', f: 3, num: 'FX 312', name: 'Lecture Hall FX 312', type: 'classroom', cap: 65, dept: 'CSE' },
            { b: 'FXB', f: 3, num: 'FX 313', name: 'Lecture Hall FX 313', type: 'classroom', cap: 65, dept: 'CSE' },
            { b: 'FXB', f: 3, num: 'FX 314', name: 'Lecture Hall FX 314', type: 'classroom', cap: 65, dept: 'CSE' },
            { b: 'FXB', f: 3, num: 'FX 315', name: 'Communication Lab', type: 'lab', cap: 60, dept: 'ECE' },

            // ==================== MECHANICAL BLOCK ====================
            // Ground Floor
            { b: 'MEB', f: 0, num: 'ME-CX', name: 'CircuitX Lab', type: 'lab', cap: 40, dept: 'MECH' },
            { b: 'MEB', f: 0, num: 'ME-FCW', name: 'Flow Craft and WoodX Workshop', type: 'workshop', cap: 50, dept: 'MECH' },
            { b: 'MEB', f: 0, num: 'ME 003', name: 'CAM Lab (Computer Aided Manufacturing)', type: 'lab', cap: 60, dept: 'MECH' },
            { b: 'MEB', f: 0, num: 'ME-QX', name: 'Quantax Testing Lab', type: 'lab', cap: 40, dept: 'MECH' },
            { b: 'MEB', f: 0, num: 'ME 006', name: 'Manufacturing Tech-I (Lathe Shop)', type: 'workshop', cap: 60, dept: 'MECH' },
            { b: 'MEB', f: 0, num: 'ME 007', name: 'Manufacturing Tech-II (Special Machine Lab)', type: 'workshop', cap: 60, dept: 'MECH' },
            { b: 'MEB', f: 0, num: 'ME 008', name: 'Strength of Materials Lab (R&D Lab)', type: 'lab', cap: 50, dept: 'MECH' },
            { b: 'MEB', f: 0, num: 'ME 009', name: 'Engineering Practice Lab', type: 'workshop', cap: 60, dept: 'MECH' },
            { b: 'MEB', f: 0, num: 'ME 010', name: 'Thermal Laboratory', type: 'lab', cap: 50, dept: 'MECH' },
            { b: 'MEB', f: 0, num: 'ME 011', name: 'Innovation & Product Development Applied Lab', type: 'lab', cap: 50, dept: 'MECH' },
            { b: 'MEB', f: 0, num: 'ME 012', name: 'Electrical AC Machines Laboratory', type: 'lab', cap: 60, dept: 'EEE' },
            { b: 'MEB', f: 0, num: 'ME 013', name: 'Electrical DC Machines Laboratory', type: 'lab', cap: 60, dept: 'EEE' },
            { b: 'MEB', f: 0, num: 'ME 014A', name: 'AICTE IDEA Lab (Product Design & Prototyping)', type: 'lab', cap: 60, dept: 'ALL' },
            { b: 'MEB', f: 0, num: 'ME 015', name: 'Dept. of Physical Education', type: 'office', cap: 30, dept: 'SPORTS' },

            // First Floor
            { b: 'MEB', f: 1, num: 'ME 101', name: 'Lecture Hall ME 101', type: 'classroom', cap: 65, dept: 'MECH' },
            { b: 'MEB', f: 1, num: 'ME 102', name: 'Lecture Hall ME 102', type: 'classroom', cap: 65, dept: 'MECH' },
            { b: 'MEB', f: 1, num: 'ME 103', name: 'Lecture Hall ME 103', type: 'classroom', cap: 65, dept: 'MECH' },
            { b: 'MEB', f: 1, num: 'ME 104', name: 'Lecture Hall ME 104 (IV ECE B)', type: 'classroom', cap: 65, dept: 'ECE' },
            { b: 'MEB', f: 1, num: 'ME 105', name: 'Mechanical Staff Room', type: 'staff_room', cap: 25, dept: 'MECH' },
            { b: 'MEB', f: 1, num: 'ME 106A', name: 'Industrial Safety Lab', type: 'lab', cap: 50, dept: 'MECH' },
            { b: 'MEB', f: 1, num: 'ME-NIL', name: 'NI Lab (National Instruments Automation)', type: 'lab', cap: 50, dept: 'ECE' },
            { b: 'MEB', f: 1, num: 'ME-SH', name: 'Mechanical Seminar Hall', type: 'seminar_hall', cap: 150, dept: 'MECH' },
            { b: 'MEB', f: 1, num: 'ME 107B', name: 'Design and Analysis Applied Lab', type: 'lab', cap: 50, dept: 'MECH' },

            // Second Floor
            { b: 'MEB', f: 2, num: 'ME 201', name: 'Lecture Hall ME 201', type: 'classroom', cap: 65, dept: 'MECH' },
            { b: 'MEB', f: 2, num: 'ME 202', name: 'Lecture Hall ME 202', type: 'classroom', cap: 65, dept: 'MECH' },
            { b: 'MEB', f: 2, num: 'ME 203', name: 'Lecture Hall ME 203', type: 'classroom', cap: 65, dept: 'MECH' },
            { b: 'MEB', f: 2, num: 'ME 204', name: 'Lecture Hall ME 204', type: 'classroom', cap: 65, dept: 'MECH' },
            { b: 'MEB', f: 2, num: 'ME 205', name: 'Lecture Hall ME 205', type: 'classroom', cap: 65, dept: 'MECH' },
            { b: 'MEB', f: 2, num: 'ME 206', name: 'Lecture Hall ME 206', type: 'classroom', cap: 65, dept: 'MECH' },
            { b: 'MEB', f: 2, num: 'ME 207A', name: 'Classroom ME 207A', type: 'classroom', cap: 60, dept: 'MECH' },
            { b: 'MEB', f: 2, num: 'ME 207B', name: 'Classroom ME 207B', type: 'classroom', cap: 60, dept: 'MECH' },

            // Third Floor
            { b: 'MEB', f: 3, num: 'ME 301', name: 'Lecture Hall ME 301', type: 'classroom', cap: 65, dept: 'MECH' },
            { b: 'MEB', f: 3, num: 'ME 302', name: 'Lecture Hall ME 302', type: 'classroom', cap: 65, dept: 'MECH' },
            { b: 'MEB', f: 3, num: 'ME 303', name: 'Lecture Hall ME 303', type: 'classroom', cap: 65, dept: 'MECH' },
            { b: 'MEB', f: 3, num: 'ME 304', name: 'Lecture Hall ME 304', type: 'classroom', cap: 65, dept: 'MECH' },
            { b: 'MEB', f: 3, num: 'ME 305', name: 'Lecture Hall ME 305', type: 'classroom', cap: 65, dept: 'MECH' },
            { b: 'MEB', f: 3, num: 'ME 306A', name: 'Classroom ME 306A', type: 'classroom', cap: 60, dept: 'MECH' },
            { b: 'MEB', f: 3, num: 'ME-ADL', name: 'Architecture and Design Applied Lab', type: 'lab', cap: 50, dept: 'ALL' },
            { b: 'MEB', f: 3, num: 'ME-EPL', name: 'Engineering Practice Laboratory', type: 'lab', cap: 60, dept: 'ALL' },

            // ==================== LIBRARY BLOCK ====================
            // Ground Floor
            { b: 'LIB', f: 0, num: 'LIB-GYM', name: 'FX Gym (Campus Fitness Centre)', type: 'fitness', cap: 40, dept: 'SPORTS' },

            // Second Floor
            { b: 'LIB', f: 2, num: 'LIB-SR', name: 'Library Staff Room', type: 'staff_room', cap: 20, dept: 'LIB' },
            { b: 'LIB', f: 2, num: 'MCA 02', name: 'IoT Lab (Internet of Things)', type: 'lab', cap: 60, dept: 'MCA' },
            { b: 'LIB', f: 2, num: 'MCA 03', name: 'MCA Lecture Hall 03', type: 'classroom', cap: 60, dept: 'MCA' },
            { b: 'LIB', f: 2, num: 'MCA 04', name: 'MCA Lecture Hall 04', type: 'classroom', cap: 60, dept: 'MCA' },
            { b: 'LIB', f: 2, num: 'MCA 05', name: 'MCA Lecture Hall 05', type: 'classroom', cap: 60, dept: 'MCA' },
            { b: 'LIB', f: 2, num: 'MCA 06', name: 'MCA Lab (Applications Lab)', type: 'lab', cap: 60, dept: 'MCA' },

            // Third Floor
            { b: 'LIB', f: 3, num: 'LIB-MAL', name: 'Mobile App Lab', type: 'lab', cap: 60, dept: 'MCA' },
            { b: 'LIB', f: 3, num: 'LIB-PCL', name: 'Programming and Coding Lab', type: 'lab', cap: 60, dept: 'MCA' },

            // ==================== MBA BLOCK ====================
            // Ground Floor
            { b: 'MBA', f: 0, num: 'MBA-SH', name: 'MBA Seminar Hall', type: 'seminar_hall', cap: 120, dept: 'MBA' },

            // First Floor
            { b: 'MBA', f: 1, num: 'MBA-LAB', name: 'MBA Computer Laboratory', type: 'lab', cap: 60, dept: 'MBA' },
            { b: 'MBA', f: 1, num: 'MBA-LIB', name: 'MBA Department Library', type: 'library', cap: 40, dept: 'MBA' },

            // Second Floor
            { b: 'MBA', f: 2, num: 'MBA-LH1', name: 'MBA Lecture Hall I', type: 'classroom', cap: 65, dept: 'MBA' },
            { b: 'MBA', f: 2, num: 'MBA-LH2', name: 'MBA Lecture Hall II', type: 'classroom', cap: 65, dept: 'MBA' },
            { b: 'MBA', f: 2, num: 'MBA-SR', name: 'MBA Staff Room', type: 'staff_room', cap: 25, dept: 'MBA' },

            // ==================== CAMPUS FACILITIES ====================
            // Ground Floor
            { b: 'FAC', f: 0, num: 'CANTEEN', name: 'Campus Food Court & Canteen', type: 'dining', cap: 300, dept: 'ALL' },
            { b: 'FAC', f: 0, num: 'AUDITORIUM', name: 'Main Institution Auditorium', type: 'auditorium', cap: 1000, dept: 'ALL' }
        ];

        let insertedCount = 0;
        for (const r of roomsData) {
            const bId = buildingMap[r.b];
            const fId = floorMap[`${r.b}_${r.f}`];
            if (!bId || !fId) {
                console.warn(`Skipping room ${r.num}: Missing building or floor for ${r.b} floor ${r.f}`);
                continue;
            }

            await pool.query(
                `INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, capacity, department)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [bId, fId, r.num, r.name, r.type, r.cap, r.dept]
            );
            insertedCount++;
        }
        console.log(`✓ Successfully seeded ${insertedCount} real campus rooms, labs, workshops, and facilities!`);

        // 6. Seed a clean initial active session for testing Daniel A in Room AK 207 (IT 2nd Year Lecture Hall)
        const [targetRoom] = await pool.query('SELECT * FROM rooms WHERE room_number = "AK 207" LIMIT 1');
        const [studentUser] = await pool.query('SELECT * FROM users WHERE email = "daniela.ug.24.it@francisxavier.ac.in" LIMIT 1');
        const [staffUser] = await pool.query('SELECT * FROM users WHERE role = "staff" AND department = "IT" LIMIT 1');

        if (targetRoom.length > 0 && studentUser.length > 0 && staffUser.length > 0) {
            const today = new Date().toISOString().slice(0, 10);
            const roomId = targetRoom[0].id;
            const studentId = studentUser[0].id;
            const staffId = staffUser[0].id;

            // Generate an active OTP for AK 207
            const expiresAt = new Date(Date.now() + 600 * 1000);
            await pool.query(
                'INSERT INTO active_otps (room_id, staff_id, period_id, otp_code, expires_at) VALUES (?, ?, 1, "739214", ?)',
                [roomId, staffId, expiresAt]
            );

            // Record Daniel A attendance in AK 207
            await pool.query(
                `INSERT INTO attendance_records (student_id, period_id, room_id, staff_id, date, status, otp_used)
                 VALUES (?, 1, ?, ?, ?, "present", "739214")`,
                [studentId, roomId, staffId, today]
            );

            // Record initial movement
            await pool.query(
                `INSERT INTO student_movements (student_id, from_room_id, to_room_id, period_id, date, duration_minutes, note)
                 VALUES (?, NULL, ?, 1, ?, 50, "Checked into Dr. APJ Abdul Kalam Block Rm AK 207 via 10s OTP")`,
                [studentId, roomId, today]
            );

            console.log(`✓ Initialized live attendance in Room ${targetRoom[0].room_number} (${targetRoom[0].name})`);
        }

        console.log('\n========================================================');
        console.log('🎉 REAL CAMPUS SEED COMPLETED SUCCESSFULLY!');
        console.log('========================================================');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during room seeding:', err);
        process.exit(1);
    }
}

seedCollegeRooms();
