-- AttendOTP schema (generated from the live database)
-- Create the database first:  CREATE DATABASE otp_attendance CHARACTER SET utf8mb4;
-- Then:  mysql -u <user> -p otp_attendance < schema.sql

-- buildings
CREATE TABLE IF NOT EXISTS `buildings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- floors
CREATE TABLE IF NOT EXISTS `floors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `building_id` int NOT NULL,
  `floor_number` int NOT NULL,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `building_id` (`building_id`),
  CONSTRAINT `floors_ibfk_1` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- rooms
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `building_id` int NOT NULL,
  `floor_id` int NOT NULL,
  `room_number` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `room_type` varchar(50) DEFAULT 'classroom',
  `capacity` int DEFAULT '60',
  `department` varchar(50) DEFAULT 'ALL',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_building_room` (`building_id`,`room_number`),
  KEY `floor_id` (`floor_id`),
  CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rooms_ibfk_2` FOREIGN KEY (`floor_id`) REFERENCES `floors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'student',
  `department` varchar(50) DEFAULT 'IT',
  `designation` varchar(100) DEFAULT NULL,
  `roll_number` varchar(50) DEFAULT NULL,
  `year_of_study` varchar(10) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_role_dept` (`role`,`department`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- periods
CREATE TABLE IF NOT EXISTS `periods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `period_number` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_break` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- active_otps
CREATE TABLE IF NOT EXISTS `active_otps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `staff_id` int NOT NULL,
  `period_id` int NOT NULL,
  `otp_code` varchar(6) NOT NULL,
  `generated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  KEY `staff_id` (`staff_id`),
  KEY `idx_room_expire` (`room_id`,`expires_at`),
  KEY `idx_period` (`period_id`),
  CONSTRAINT `active_otps_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `active_otps_ibfk_2` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `active_otps_ibfk_3` FOREIGN KEY (`period_id`) REFERENCES `periods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- attendance_records
CREATE TABLE IF NOT EXISTS `attendance_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `period_id` int NOT NULL,
  `room_id` int NOT NULL,
  `staff_id` int DEFAULT NULL,
  `date` date NOT NULL,
  `marked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(50) DEFAULT 'present',
  `otp_used` varchar(6) DEFAULT NULL,
  `device_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_period_date` (`student_id`,`period_id`,`date`),
  KEY `period_id` (`period_id`),
  KEY `idx_att_lookup` (`student_id`,`date`,`period_id`),
  KEY `idx_room_date` (`room_id`,`date`),
  KEY `idx_date_status` (`date`,`status`),
  CONSTRAINT `attendance_records_ibfk_2` FOREIGN KEY (`period_id`) REFERENCES `periods` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_records_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_attendance_records_student_id` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- classroom_headcounts
CREATE TABLE IF NOT EXISTS `classroom_headcounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `staff_id` int NOT NULL,
  `period_id` int NOT NULL,
  `otp_count` int NOT NULL DEFAULT '0',
  `visual_count` int NOT NULL DEFAULT '0',
  `image_url` varchar(255) NOT NULL,
  `boxes_json` json DEFAULT NULL,
  `match_status` varchar(50) DEFAULT 'verified',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_room_period` (`room_id`,`period_id`),
  KEY `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- device_locks
CREATE TABLE IF NOT EXISTS `device_locks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `device_id` varchar(255) NOT NULL,
  `device_fingerprint` text NOT NULL,
  `device_name` varchar(150) DEFAULT 'Mobile / Browser Device',
  `platform` varchar(100) DEFAULT NULL,
  `user_agent` text,
  `screen_resolution` varchar(50) DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `is_locked` tinyint(1) DEFAULT '1',
  `locked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_verified_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_user_device` (`user_id`,`device_id`),
  CONSTRAINT `device_locks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- fcm_tokens
CREATE TABLE IF NOT EXISTS `fcm_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `department` varchar(50) DEFAULT NULL,
  `token` text NOT NULL,
  `device_info` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_token` (`user_id`,`token`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- holidays
CREATE TABLE IF NOT EXISTS `holidays` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(150) NOT NULL,
  `holiday_date` date NOT NULL,
  `scope` enum('college','department') DEFAULT 'college',
  `department` varchar(50) DEFAULT 'ALL',
  `declared_by` int NOT NULL,
  `reason` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `is_timed` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `declared_by` (`declared_by`),
  CONSTRAINT `holidays_ibfk_1` FOREIGN KEY (`declared_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- leave_applications
CREATE TABLE IF NOT EXISTS `leave_applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `type` enum('internal','external') NOT NULL DEFAULT 'internal',
  `event_name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT 'Symposium / Hackathon',
  `venue` varchar(255) DEFAULT '',
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `is_all_day` tinyint(1) DEFAULT '1',
  `from_period` int DEFAULT '1',
  `to_period` int DEFAULT '7',
  `reason` text NOT NULL,
  `mentor_id` int DEFAULT NULL,
  `status` enum('pending_mentor','pending_hod','approved','rejected') NOT NULL DEFAULT 'pending_mentor',
  `mentor_remarks` text,
  `mentor_reviewed_at` datetime DEFAULT NULL,
  `hod_remarks` text,
  `hod_reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_student` (`student_id`),
  KEY `idx_status` (`status`),
  KEY `idx_dates` (`from_date`,`to_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- notification_log
CREATE TABLE IF NOT EXISTS `notification_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kind` varchar(120) NOT NULL,
  `ref_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kind_date` (`kind`,`ref_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- push_subscriptions
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `endpoint` text NOT NULL,
  `endpoint_hash` char(64) NOT NULL,
  `p256dh` varchar(255) NOT NULL,
  `auth` varchar(255) NOT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_ok_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_endpoint` (`endpoint_hash`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `push_subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- sports_od_passes
CREATE TABLE IF NOT EXISTS `sports_od_passes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_name` varchar(150) NOT NULL,
  `sport_category` varchar(100) DEFAULT 'General Sports',
  `venue` varchar(150) DEFAULT 'FXEC Sports Arena',
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `is_all_day` tinyint(1) DEFAULT '1',
  `from_period` int DEFAULT '1',
  `to_period` int DEFAULT '7',
  `reason` text,
  `created_by` int NOT NULL,
  `status` varchar(50) DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `sports_od_passes_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- sports_od_students
CREATE TABLE IF NOT EXISTS `sports_od_students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pass_id` int NOT NULL,
  `student_id` int NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `added_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pass_student` (`pass_id`,`student_id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `sports_od_students_ibfk_1` FOREIGN KEY (`pass_id`) REFERENCES `sports_od_passes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sports_od_students_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- staff_movements
CREATE TABLE IF NOT EXISTS `staff_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `staff_id` int NOT NULL,
  `from_room_id` int DEFAULT NULL,
  `to_room_id` int NOT NULL,
  `period_id` int NOT NULL DEFAULT '1',
  `date` date NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `duration_minutes` int DEFAULT '0',
  `note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `staff_id` (`staff_id`),
  KEY `to_room_id` (`to_room_id`),
  KEY `date` (`date`),
  KEY `idx_staff_date` (`staff_id`,`date`),
  CONSTRAINT `fk_sm_staff` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_staff_movements_to_room_id` FOREIGN KEY (`to_room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- student_day_locks
CREATE TABLE IF NOT EXISTS `student_day_locks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `date` date NOT NULL,
  `first_otp_at` timestamp NULL DEFAULT NULL,
  `is_locked_out` tinyint(1) DEFAULT '0',
  `reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_date` (`student_id`,`date`),
  KEY `idx_student_date` (`student_id`,`date`),
  CONSTRAINT `student_day_locks_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- student_movements
CREATE TABLE IF NOT EXISTS `student_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `from_room_id` int DEFAULT NULL,
  `to_room_id` int NOT NULL,
  `period_id` int NOT NULL,
  `date` date NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `duration_minutes` int DEFAULT '0',
  `note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `period_id` (`period_id`),
  KEY `fk_student_movements_to_room_id` (`to_room_id`),
  CONSTRAINT `fk_student_movements_to_room_id` FOREIGN KEY (`to_room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `student_movements_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_movements_ibfk_3` FOREIGN KEY (`period_id`) REFERENCES `periods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- user_feedbacks
CREATE TABLE IF NOT EXISTS `user_feedbacks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `user_email` varchar(255) DEFAULT NULL,
  `user_role` varchar(50) DEFAULT NULL,
  `category` varchar(100) DEFAULT 'General Feedback',
  `message` text NOT NULL,
  `rating` int DEFAULT '5',
  `device_info` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'open',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Period timetable (college schedule)
INSERT INTO periods (period_number, name, start_time, end_time, is_break) VALUES
(1, '1st Period', '09:00:00', '09:50:00', 0),
(2, '2nd Period', '09:50:00', '10:40:00', 0),
(0, 'Morning Break', '10:40:00', '11:00:00', 1),
(3, '3rd Period', '11:00:00', '11:50:00', 0),
(4, '4th Period', '11:50:00', '12:40:00', 0),
(0, 'Lunch Break', '12:40:00', '13:30:00', 1),
(5, '5th Period', '13:30:00', '14:15:00', 0),
(6, '6th Period', '14:15:00', '15:05:00', 0),
(0, 'Afternoon Break', '15:05:00', '15:20:00', 1),
(7, '7th Period', '15:20:00', '16:05:00', 0);

-- No users are seeded. Create the first accounts with the IT Operations console
-- (see deploy/README.md) or backend/scripts/seed_staff_from_csv.js.
