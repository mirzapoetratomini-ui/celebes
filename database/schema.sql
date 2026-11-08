-- ============================================================
-- DATABASE SCHEMA: Celebes Event (Event & Ticketing Management)
-- Database Engine: MySQL 5.7 / 8.0 / MariaDB (100% cPanel Ready)
-- Character Set: utf8mb4_unicode_ci
-- Target: cPanel phpMyAdmin / VPS / Shared Hosting / Docker
-- ============================================================

-- PANDUAN IMPORT cPANEL:
-- 1. Buka phpMyAdmin di cPanel hosting Anda.
-- 2. Klik nama database Anda di panel kiri (misal: bergulir_celebeseventok).
-- 3. Klik menu Impor > Pilih file schema.sql ini > Klik Kirim (Go).

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `attendee_responses`;
DROP TABLE IF EXISTS `tickets`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `custom_form_fields`;
DROP TABLE IF EXISTS `ticket_tiers`;
DROP TABLE IF EXISTS `vouchers`;
DROP TABLE IF EXISTS `payout_requests`;
DROP TABLE IF EXISTS `events`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `support_tickets`;
DROP TABLE IF EXISTS `faqs`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `email_notifications`;
DROP TABLE IF EXISTS `national_events`;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- Table 1: users (Super Admin, Creator, Peserta/User)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NULL,
  `role` ENUM('admin', 'creator', 'user') NOT NULL DEFAULT 'user',
  `avatar` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `organization` VARCHAR(191) NULL,
  `auth_provider` ENUM('local', 'google', 'facebook', 'twitter') NOT NULL DEFAULT 'local',
  `provider_id` VARCHAR(191) NULL,
  `status` ENUM('active', 'suspended', 'pending', 'pending_approval') NOT NULL DEFAULT 'active',
  `bank_name` VARCHAR(100) NULL,
  `bank_account_number` VARCHAR(100) NULL,
  `bank_account_name` VARCHAR(191) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table 2: events (Dibuat oleh Kreator, Dikelola Super Admin)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `events` (
  `id` VARCHAR(50) NOT NULL,
  `creator_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `banner_image` TEXT NULL,
  `short_description` TEXT NULL,
  `description` LONGTEXT NULL,
  `start_date` DATETIME NOT NULL,
  `end_date` DATETIME NOT NULL,
  `location_type` ENUM('venue', 'online', 'hybrid') NOT NULL DEFAULT 'venue',
  `venue_name` VARCHAR(255) NULL,
  `venue_address` TEXT NULL,
  `online_meeting_url` TEXT NULL,
  `status` ENUM('published', 'draft', 'pending_approval', 'ended', 'cancelled') NOT NULL DEFAULT 'published',
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `registration_limit` INT NOT NULL DEFAULT 0,
  `social_share_slug` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_events_slug` (`slug`),
  KEY `idx_events_creator` (`creator_id`),
  KEY `idx_events_status` (`status`),
  KEY `idx_events_dates` (`start_date`, `end_date`),
  CONSTRAINT `fk_events_creator` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table 3: ticket_tiers (Jenis Tiket per Event)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_tiers` (
  `id` VARCHAR(50) NOT NULL,
  `event_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `quota` INT NOT NULL DEFAULT 100,
  `sold_count` INT NOT NULL DEFAULT 0,
  `max_per_order` INT NOT NULL DEFAULT 5,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tiers_event` (`event_id`),
  CONSTRAINT `fk_tiers_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table 4: custom_form_fields (Form Pendaftaran Dinamis per Event)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `custom_form_fields` (
  `id` VARCHAR(50) NOT NULL,
  `event_id` VARCHAR(50) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `field_type` ENUM('text', 'number', 'email', 'phone', 'dropdown', 'checkbox', 'textarea') NOT NULL DEFAULT 'text',
  `placeholder` VARCHAR(255) NULL,
  `options_json` TEXT NULL COMMENT 'JSON array jika field_type dropdown/checkbox',
  `is_required` TINYINT(1) NOT NULL DEFAULT 0,
  `order_index` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_form_fields_event` (`event_id`),
  CONSTRAINT `fk_fields_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table 5: vouchers (Kode Promo / Diskon)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `vouchers` (
  `id` VARCHAR(50) NOT NULL,
  `event_id` VARCHAR(50) NULL COMMENT 'NULL jika berlaku global',
  `code` VARCHAR(50) NOT NULL,
  `discount_type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  `discount_value` DECIMAL(12, 2) NOT NULL,
  `quota` INT NOT NULL DEFAULT 50,
  `used_count` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `valid_until` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_vouchers_code` (`code`),
  KEY `idx_vouchers_event` (`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table 6: orders (Transaksi & Pembayaran)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(50) NOT NULL,
  `order_number` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `event_id` VARCHAR(50) NOT NULL,
  `buyer_name` VARCHAR(191) NOT NULL,
  `buyer_email` VARCHAR(191) NOT NULL,
  `buyer_phone` VARCHAR(50) NOT NULL,
  `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `platform_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `payment_type` ENUM('automatic', 'manual') NOT NULL DEFAULT 'automatic',
  `payment_method` ENUM('qris', 'bank_transfer', 'virtual_account', 'credit_card', 'free', 'bank_transfer_manual') NOT NULL DEFAULT 'qris',
  `payment_channel` VARCHAR(100) NULL,
  `payment_status` ENUM('pending', 'pending_manual_verification', 'paid', 'payment_rejected', 'expired', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
  `payment_reference` VARCHAR(100) NULL,
  `payment_proof_url` LONGTEXT NULL,
  `sender_bank` VARCHAR(100) NULL,
  `sender_account_name` VARCHAR(191) NULL,
  `transfer_notes` TEXT NULL,
  `verified_by` VARCHAR(191) NULL,
  `verified_at` DATETIME NULL,
  `rejection_reason` TEXT NULL,
  `paid_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orders_number` (`order_number`),
  KEY `idx_orders_user` (`user_id`),
  KEY `idx_orders_event` (`event_id`),
  KEY `idx_orders_status` (`payment_status`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_orders_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table 7: tickets (E-Ticket per Peserta)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` VARCHAR(50) NOT NULL,
  `order_id` VARCHAR(50) NOT NULL,
  `event_id` VARCHAR(50) NOT NULL,
  `tier_id` VARCHAR(50) NOT NULL,
  `ticket_code` VARCHAR(50) NOT NULL,
  `qr_payload` VARCHAR(255) NOT NULL,
  `attendee_name` VARCHAR(191) NOT NULL,
  `attendee_email` VARCHAR(191) NOT NULL,
  `check_in_status` ENUM('not_checked_in', 'checked_in') NOT NULL DEFAULT 'not_checked_in',
  `check_in_time` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tickets_code` (`ticket_code`),
  KEY `idx_tickets_order` (`order_id`),
  KEY `idx_tickets_event` (`event_id`),
  KEY `idx_tickets_tier` (`tier_id`),
  CONSTRAINT `fk_tickets_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tickets_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`),
  CONSTRAINT `fk_tickets_tier` FOREIGN KEY (`tier_id`) REFERENCES `ticket_tiers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table 8: attendee_responses (Jawaban Form Kustom)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendee_responses` (
  `id` VARCHAR(50) NOT NULL,
  `ticket_id` VARCHAR(50) NOT NULL,
  `field_id` VARCHAR(50) NOT NULL,
  `field_label` VARCHAR(255) NOT NULL,
  `response_value` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_resp_ticket` (`ticket_id`),
  KEY `idx_resp_field` (`field_id`),
  CONSTRAINT `fk_resp_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table 9: payout_requests (Penarikan Dana Kreator)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payout_requests` (
  `id` VARCHAR(50) NOT NULL,
  `creator_id` VARCHAR(50) NOT NULL,
  `event_id` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `bank_name` VARCHAR(100) NOT NULL,
  `account_number` VARCHAR(100) NOT NULL,
  `account_name` VARCHAR(191) NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `admin_note` TEXT NULL,
  `processed_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payout_creator` (`creator_id`),
  KEY `idx_payout_event` (`event_id`),
  CONSTRAINT `fk_payout_creator` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_payout_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table 10: support_tickets (Pusat Bantuan & Komplain)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` VARCHAR(50) NOT NULL,
  `ticket_number` VARCHAR(50) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(50) NULL,
  `category` ENUM('pembayaran', 'tiket', 'event', 'akun', 'lainnya') NOT NULL DEFAULT 'lainnya',
  `priority` ENUM('rendah', 'sedang', 'tinggi') NOT NULL DEFAULT 'sedang',
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  `admin_reply` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_supp_number` (`ticket_number`),
  KEY `idx_supp_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table 11: faqs (Pertanyaan yang Sering Diajukan)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `faqs` (
  `id` VARCHAR(50) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `question` VARCHAR(255) NOT NULL,
  `answer` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table 12: system_settings (Konfigurasi Platform)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table 13: email_notifications (Log Notifikasi Email Resmi)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_notifications` (
  `id` VARCHAR(50) NOT NULL,
  `recipient_email` VARCHAR(191) NOT NULL,
  `recipient_name` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `body_html` LONGTEXT NOT NULL,
  `sent_at` DATETIME NOT NULL,
  `status` ENUM('sent', 'failed') NOT NULL DEFAULT 'sent',
  `type` VARCHAR(50) NOT NULL DEFAULT 'creator_approval',
  `user_id` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_recipient` (`recipient_email`),
  KEY `idx_email_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- SEED DATA AWAL (Initial Sample Records Celebes Event)
-- ------------------------------------------------------------

-- 1. Users: Super Admin, Creator, User, Pending Creator
INSERT INTO `users` (`id`, `email`, `name`, `password_hash`, `role`, `avatar`, `phone`, `organization`, `auth_provider`, `status`, `bank_name`, `bank_account_number`, `bank_account_name`) VALUES
('usr-admin-bergulir', 'redaksibergulircom@gmail.com', 'Super Admin Bergulir Media', 'Bergulir2026!#', 'admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80', '081241129988', 'Bergulir Media Network', 'local', 'active', 'BCA', '8880192831', 'BERGULIR MEDIA CELEBES'),
('usr-admin-01', 'admin@celebes-event.com', 'Super Administrator Celebes Event', 'demo123', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80', '081241129988', 'Celebes Event Platform HQ', 'local', 'active', 'BCA', '8880192831', 'PT CELEBES EVENT NUSANTARA'),
('usr-creator-01', 'kreator@celebescreative.id', 'Celebes Creative Promosindo', 'kreator123', 'creator', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80', '081398765432', 'Celebes Creative Promosindo', 'google', 'active', 'Bank Mandiri', '1370019283746', 'Celebes Creative Promosindo'),
('usr-creator-pending', 'makassarmusic@gmail.com', 'Makassar Indie Movement', 'kreator123', 'creator', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=256&q=80', '081234567890', 'Makassar Indie Movement', 'google', 'pending_approval', 'BCA', '7890123456', 'MAKASSAR INDIE MOVEMENT'),
('usr-user-01', 'budi.santoso@gmail.com', 'Budi Santoso', 'demo123', 'user', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80', '085712345678', 'Universitas Hasanuddin Makassar', 'google', 'active', NULL, NULL, NULL);

-- 2. Events
INSERT INTO `events` (`id`, `creator_id`, `title`, `slug`, `category`, `banner_image`, `short_description`, `description`, `start_date`, `end_date`, `location_type`, `venue_name`, `venue_address`, `online_meeting_url`, `status`, `is_featured`, `registration_limit`, `social_share_slug`) VALUES
('evt-001', 'usr-creator-01', 'Celebes Tech Summit & AI Expo 2026', 'celebes-tech-summit-2026', 'Teknologi & Bisnis', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80', 'Konferensi teknologi & AI terbesar di Sulawesi menghadirkan inovator digital, Cloud, dan Startup Unicorn.', 'Celebes Tech Summit & AI Expo 2026 adalah pertemuan tahunan para pemimpin teknologi, developer, founder startup, dan investor terkemuka di Sulawesi & Indonesia Timur. Dapatkan wawasan langsung mengenai Machine Learning terkini, digitalisasi maritim, otomatisasi cloud, serta peluang investasi inovasi di kawasan Celebes.', '2026-11-20 09:00:00', '2026-11-21 17:00:00', 'venue', 'Phinisi Grand Ballroom, Claro Makassar', 'Jl. A. P. Pettarani No. 03, Mannuruki, Tamalate, Kota Makassar, Sulawesi Selatan', NULL, 'published', 1, 1500, 'celebetech26'),
('evt-002', 'usr-creator-01', 'Celebes Sunset Music Festival Vol. 4', 'celebes-sunset-music-festival', 'Musik & Hiburan', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80', 'Malam magis pertunjukan musik senja di tepi Pantai Losari bersama deretan musisi nasional & musisi lokal Sulawesi.', 'Pentas musik outdoor megah di tepi Pantai Losari Makassar. Menampilkan musisi lokal Sulawesi & nasional papan atas, instalasi seni cahaya budaya Bugis-Makassar, serta puluhan tenant kuliner khas Celebes (Coto, Pisang Epe, Pallubasa).', '2026-12-05 15:00:00', '2026-12-05 23:00:00', 'venue', 'Pelataran Bugis-Makassar, Anjungan Pantai Losari', 'Jl. Penghibur, Losari, Ujung Pandang, Kota Makassar, Sulawesi Selatan', NULL, 'published', 1, 2000, 'celebesmusic26'),
('evt-003', 'usr-creator-01', 'Celebes Digital Marketing & Growth Masterclass 2026', 'celebes-digital-marketing-masterclass', 'Workshop & Edukasi', 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80', 'Pelatihan intensif optimasi conversion rate, funnel iklan Meta & TikTok, serta CRM untuk pebisnis & UMKM Sulawesi.', 'Workshop webinar interaktif live selama 4 jam penuh studi kasus nyata. Peserta akan dibimbing membuat strategi funneling, copywriting berkonversi tinggi, pengoptimalan budget iklan berbayar, dan tracking analitik.', '2026-11-28 13:00:00', '2026-11-28 17:30:00', 'online', 'Zoom Webinar VIP Room', 'Online via Zoom', 'https://zoom.us/j/9876543210', 'published', 0, 500, 'celebesgrowth26');

-- 3. Ticket Tiers
INSERT INTO `ticket_tiers` (`id`, `event_id`, `name`, `description`, `price`, `quota`, `sold_count`, `max_per_order`, `is_active`) VALUES
('tier-001', 'evt-001', 'Early Bird - Regular Access', 'Akses penuh 2 hari ke seluruh stage utama, expo hall inovasi AI, & e-sertifikat resmi.', 150000.00, 300, 142, 4, 1),
('tier-002', 'evt-001', 'VIP Executive Pass', 'Akses VIP front-row, lunch buffet bersama keynote speakers, VIP networking lounge, hoodie eksklusif.', 450000.00, 100, 48, 2, 1),
('tier-003', 'evt-002', 'Presale 1 - Festival A (Front Stage)', 'Akses area depan panggung utama, free welcoming softdrink, gelang festival glow-in-the-dark.', 120000.00, 500, 310, 5, 1),
('tier-004', 'evt-002', 'General Admission (GA)', 'Akses reguler area festival, area kuliner Celebes, panggung pertunjukan spektakuler.', 85000.00, 1000, 420, 5, 1),
('tier-005', 'evt-003', 'Peserta Online Live + E-Sertifikat', 'Akses webinar interaktif, sesi tanya jawab langsung, rekaman video, modul materi PDF.', 75000.00, 300, 89, 10, 1);

-- 4. Custom Form Fields
INSERT INTO `custom_form_fields` (`id`, `event_id`, `label`, `field_type`, `placeholder`, `options_json`, `is_required`, `order_index`) VALUES
('cf-001', 'evt-001', 'Instansi / Perusahaan / Kampus', 'text', 'Contoh: PT Celebes Digital / Univ Hasanuddin', NULL, 1, 1),
('cf-002', 'evt-001', 'Ukuran Kaos Official Event', 'dropdown', 'Pilih Ukuran Kaos', '["S", "M", "L", "XL", "XXL"]', 1, 2),
('cf-003', 'evt-001', 'Kebutuhan Khusus / Makanan (Dietary)', 'dropdown', 'Pilih Preferensi Konsumsi', '["Halal / Standar", "Vegetarian", "Bebas Seafood", "Tidak Ada"]', 0, 3),
('cf-004', 'evt-002', 'Komunitas / Asal Kota', 'text', 'Contoh: Makassar Music Enthusiast / Manado Indie Club', NULL, 0, 1),
('cf-005', 'evt-003', 'Tautan Profil LinkedIn / Website Usaha', 'text', 'https://linkedin.com/in/username', NULL, 0, 1);

-- 5. Vouchers
INSERT INTO `vouchers` (`id`, `event_id`, `code`, `discount_type`, `discount_value`, `quota`, `used_count`, `is_active`, `valid_until`) VALUES
('vch-001', NULL, 'CELEBESKEREN', 'percentage', 15.00, 100, 24, 1, '2026-12-31 23:59:59'),
('vch-002', 'evt-001', 'CELEBESTECH', 'fixed', 50000.00, 50, 18, 1, '2026-11-20 00:00:00'),
('vch-003', 'evt-002', 'SENJACELEBES', 'percentage', 20.00, 80, 12, 1, '2026-12-05 00:00:00');

-- 6. Initial Sample Orders
INSERT INTO `orders` (`id`, `order_number`, `user_id`, `event_id`, `buyer_name`, `buyer_email`, `buyer_phone`, `subtotal`, `discount_amount`, `platform_fee`, `total_amount`, `payment_method`, `payment_channel`, `payment_status`, `payment_reference`, `paid_at`) VALUES
('ord-sample-01', 'CE-202611-0001', 'usr-user-01', 'evt-001', 'Budi Santoso', 'budi.santoso@gmail.com', '085712345678', 150000.00, 0.00, 4500.00, 154500.00, 'qris', 'QRIS-Celebes Instant', 'paid', 'REF-QRIS-992182', NOW()),
('ord-sample-02', 'CE-202611-0002', 'usr-user-01', 'evt-002', 'Budi Santoso', 'budi.santoso@gmail.com', '085712345678', 85000.00, 17000.00, 4500.00, 72500.00, 'virtual_account', 'BCA Virtual Account', 'paid', 'VA-BCA-882910293847', NOW());

-- 7. Initial Sample Tickets
INSERT INTO `tickets` (`id`, `order_id`, `event_id`, `tier_id`, `ticket_code`, `qr_payload`, `attendee_name`, `attendee_email`, `check_in_status`, `check_in_time`) VALUES
('tkt-sample-01', 'ord-sample-01', 'evt-001', 'tier-001', 'CE-TECH-8821-A9F0', 'CELEBES:VERIFY:CE-TECH-8821-A9F0:evt-001:budi.santoso@gmail.com', 'Budi Santoso', 'budi.santoso@gmail.com', 'not_checked_in', NULL),
('tkt-sample-02', 'ord-sample-02', 'evt-002', 'tier-004', 'CE-SENJA-3310-7B4D', 'CELEBES:VERIFY:CE-SENJA-3310-7B4D:evt-002:budi.santoso@gmail.com', 'Budi Santoso', 'budi.santoso@gmail.com', 'checked_in', NOW());

-- 8. Attendee Responses
INSERT INTO `attendee_responses` (`id`, `ticket_id`, `field_id`, `field_label`, `response_value`) VALUES
('resp-001', 'tkt-sample-01', 'cf-001', 'Instansi / Perusahaan / Kampus', 'Universitas Hasanuddin Makassar'),
('resp-002', 'tkt-sample-01', 'cf-002', 'Ukuran Kaos Official Event', 'L'),
('resp-003', 'tkt-sample-02', 'cf-004', 'Komunitas / Asal Kota', 'Makassar Music Enthusiast');

-- 9. Support Tickets
INSERT INTO `support_tickets` (`id`, `ticket_number`, `name`, `email`, `phone`, `category`, `priority`, `subject`, `message`, `status`, `admin_reply`) VALUES
('supp-001', 'HELP-202611-001', 'Andi Wijaya', 'andi.wijaya@gmail.com', '081241129988', 'pembayaran', 'tinggi', 'Konfirmasi Transfer Manual Belum Berubah Status', 'Halo admin, saya sudah transfer untuk pesanan CE-202611-0003 sebesar Rp354.500 lewat BCA Mobile sekitar 1 jam yang lalu, mohon dicek ya apakah bukti transfernya sudah terbaca. Terima kasih.', 'in_progress', 'Halo Kak Andi, tim verifikasi Celebes Event sedang mengecek mutasi bank berkala, e-tiket akan otomatis aktif dalam hitungan menit.'),
('supp-002', 'HELP-202611-002', 'Siti Rahmawati', 'siti.rahma@perusahaan.co.id', '085711223344', 'tiket', 'sedang', 'Request Perubahan Nama Peserta di E-Ticket', 'Mohon bantuannya untuk mengoreksi nama delegasi seminar di tiket nomor CE-TECH-8821-A9F0 karena ada kesalahan ejaan gelar.', 'open', NULL);

-- 10. FAQs
INSERT INTO `faqs` (`id`, `category`, `question`, `answer`) VALUES
('faq-01', 'Pemesanan', 'Bagaimana cara membeli tiket event di Celebes Event?', 'Pilih event yang ingin Anda ikuti di halaman beranda, tentukan kategori tiket dan jumlahnya, lengkapi formulir pendaftaran, lalu pilih metode pembayaran (QRIS otomatis, Virtual Account, atau transfer manual). Setelah pembayaran terverifikasi, E-Ticket langsung terbit dan dapat diunduh dalam bentuk file PDF ber-QR Code.'),
('faq-02', 'E-Ticket', 'Berapa lama E-Ticket dan QR Code dikirimkan setelah pembayaran?', 'Untuk pembayaran otomatis (QRIS dan Virtual Account), E-Ticket terbit instan dalam waktu kurang dari 3 detik. Untuk transfer manual, setelah Anda mengunggah bukti struk transfer, admin akan memverifikasi dan tiket akan aktif maksimal 15-30 menit.'),
('faq-03', 'Keamanan', 'Apakah metode pembayaran di Celebes Event aman?', 'Sangat aman. Seluruh transaksi diproteksi enkripsi SSL berstandar Bank Indonesia dan QRIS Nasional.');

-- 11. System Settings
INSERT INTO `system_settings` (`setting_key`, `setting_value`) VALUES
('platform_name', 'Celebes Event Management'),
('platform_fee_fixed', '4500'),
('platform_fee_percentage', '2.5'),
('default_currency', 'IDR'),
('qris_merchant_name', 'CELEBES EVENT INDONESIA'),
('contact_email', 'support@celebes-event.com'),
('contact_whatsapp', '+6281241129988');

-- 12. Email Notifications Log
INSERT INTO `email_notifications` (`id`, `recipient_email`, `recipient_name`, `subject`, `body_html`, `sent_at`, `status`, `type`, `user_id`) VALUES
('notif-001', 'kreator@celebescreative.id', 'Celebes Creative Promosindo', 'Selamat! Akun Kreator Anda Telah Disetujui - Celebes Event', '<p>Selamat! Akun Kreator Anda di Celebes Event telah disetujui oleh Super Admin.</p>', NOW(), 'sent', 'creator_approval', 'usr-creator-01');

-- ------------------------------------------------------------
-- Table 13: national_events (Info Event Indonesia yang bisa ikut dipublish, dikelola Super Admin)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `national_events` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `province` VARCHAR(100) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `organizer` VARCHAR(255) NOT NULL,
  `event_date` VARCHAR(100) NOT NULL,
  `banner_url` TEXT NOT NULL,
  `external_url` TEXT NOT NULL,
  `cta_label` VARCHAR(100) DEFAULT 'Buka Link Publikasi Resmi',
  `badge` VARCHAR(100) DEFAULT 'Bisa Ikut Publikasi',
  `description` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `order_index` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_nat_events_active` (`is_active`),
  KEY `idx_nat_events_prov` (`province`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Initial National Events Seed Data
INSERT INTO `national_events` (`id`, `title`, `province`, `city`, `category`, `organizer`, `event_date`, `banner_url`, `external_url`, `cta_label`, `badge`, `description`, `is_active`, `order_index`, `created_at`) VALUES
('nat-ev-01', 'Jakarta International Sound & Creative Expo (JISCE 2026)', 'DKI Jakarta', 'Jakarta Pusat (JIExpo Kemayoran)', 'Festival Musik & Hiburan', 'Asosiasi Promotor & Pengusaha Panggung Indonesia', '24 - 26 Juli 2026', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80', 'https://event.bergulir.com/publish/jisce-jakarta-2026', 'Buka Link Publikasi Resmi', 'Bisa Ikut Publikasi', 'Pameran industri musik, tata suara, panggung festival terbesar di Asia Tenggara. Promotor dan EO daerah dapat bergabung dalam jejaring publikasi tiket serentak nusantara.', 1, 1, NOW()),
('nat-ev-02', 'Bali Creative & Tech Nomad Summit 2026', 'Bali', 'Badung / Nusa Dua', 'Teknologi & Bisnis', 'Bali Creative Hub & Global Tech Partners', '14 - 16 Agustus 2026', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80', 'https://event.bergulir.com/publish/bali-tech-summit-2026', 'Ikut Kemitraan Publikasi', 'Call for Partners', 'Pertemuan 2.500+ founder startup, digital nomad, dan kreator konten dunia di Bali. Pendaftaran slot co-host dan jalur distribusi tiket terbuka untuk mitra seluruh Indonesia.', 1, 2, NOW()),
('nat-ev-03', 'Borobudur Heritage Cultural Run & Festival 2026', 'Jawa Tengah', 'Magelang / Candi Borobudur', 'Olahraga & Fun Run', 'Yayasan Warisan Candi & Komite Olahraga Pariwisata', '6 September 2026', 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=1200&q=80', 'https://event.bergulir.com/publish/borobudur-run-2026', 'Lihat Info & Tiket Resmi', 'Bisa Ikut Publikasi', 'Lari maraton 10K & 21K mengitari keindahan candi bersejarah Borobudur dan perdesaan asri. Menerima publikasi kolaborasi komunitas lari dan agen tiket se-Indonesia.', 1, 3, NOW()),
('nat-ev-04', 'Makassar International Eight Festival (F8 Celebes) 2026', 'Sulawesi Selatan', 'Makassar (Anjungan Pantai Losari)', 'Budaya & Kuliner', 'Dinas Pariwisata Makassar & PT Festival Delapan', '23 - 27 September 2026', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80', 'https://event.bergulir.com/publish/f8-makassar-celebes', 'Buka Link Publikasi Resmi', 'Featured Nasional', 'Festival akbar 8 unsur seni dan budaya (Fashion, Film, Food, Folk, Fine Art, Flora Fauna, Fusion Music, Fiction Writer) pesisir Sulawesi Selatan bertaraf internasional.', 1, 4, NOW()),
('nat-ev-05', 'Bandung Indie Creative Week & Fashion Circuit 2026', 'Jawa Barat', 'Bandung (Area Gedung Sate / Gasibu)', 'Pameran & Expo', 'Kolektif Kreatif Priangan Nusantara', '10 - 12 Oktober 2026', 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80', 'https://event.bergulir.com/publish/bandung-creative-week', 'Daftar Jejaring Promosi', 'Bisa Ikut Publikasi', 'Eksibisi karya desainer lokal, distro fashion, dan pertunjukan band indie nusantara. Komunitas kreatif dari luar Jawa dapat berpartisipasi dalam slot publikasi bersama.', 1, 5, NOW()),
('nat-ev-06', 'Nusantara Borneo Future Green Expo 2026', 'Kalimantan Timur', 'Balikpapan & Kawasan IKN', 'Pendidikan & Seminar', 'Dewan Pemuda Nusantara & Mitra Industri Hijau', '7 - 9 November 2026', 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80', 'https://event.bergulir.com/publish/borneo-green-expo', 'Buka Tautan Resmi', 'Kemitraan Terbuka', 'Forum pemuda dan inovator transisi energi ramah lingkungan pulau Kalimantan dan kawasan ibu kota nusantara. Terbuka kerjasama publikasi delegasi organisasi se-Indonesia.', 1, 6, NOW());

