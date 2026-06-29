-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Fixture tables atelier pour lumosphere_test (local)
-- Crée les tables dans leur état final post-migration 010+011.
-- Usage : mysql -u lumo_test -plumo_test_pwd lumosphere_test < db/seeds/setup_atelier_test.sql
-- ═══════════════════════════════════════════════════════════════════
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;
SET FOREIGN_KEY_CHECKS = 0;

-- collect_sources (post-010 + 011)
CREATE TABLE IF NOT EXISTS `collect_sources` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `source_type` enum('telegram','youtube','html') NOT NULL,
  `label` varchar(255) NOT NULL,
  `config_json` longtext NOT NULL DEFAULT '{}',
  `first_marker` date DEFAULT NULL,
  `last_marker` date DEFAULT NULL,
  `last_update_id` bigint(20) DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `history_import_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `run_every_hours` tinyint(3) unsigned NOT NULL DEFAULT 12,
  `run_every_days` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `last_run_at` datetime DEFAULT NULL,
  `last_error` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- lots (post-010)
CREATE TABLE IF NOT EXISTS `lots` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lot_id` varchar(100) NOT NULL,
  `source_type` enum('pdf','telegram','youtube','html') NOT NULL,
  `source_id` int(11) DEFAULT NULL,
  `titre_lot` varchar(500) NOT NULL DEFAULT '',
  `status` enum('en_attente','en_cours','en_traitement','en_revision','a_reprendre','pret','integre','erreur') NOT NULL DEFAULT 'en_attente',
  `assigned_to` int(11) unsigned DEFAULT NULL,
  `last_editor` int(11) unsigned DEFAULT NULL,
  `current_step` varchar(50) NOT NULL DEFAULT '0_raw',
  `lot_folder_path` varchar(1000) DEFAULT NULL,
  `date_source_debut` date NOT NULL,
  `date_source_fin` date DEFAULT NULL,
  `debug_mode` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lots_lot_id` (`lot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- documents (post-010)
CREATE TABLE IF NOT EXISTS `documents` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lot_id` varchar(100) NOT NULL,
  `titre` varchar(500) NOT NULL DEFAULT '',
  `type_document` enum('pdf','telegram','youtube','html') NOT NULL,
  `source_item_id` varchar(128) DEFAULT NULL,
  `status` enum('en_attente','en_cours','en_traitement','en_revision','a_reprendre','pret','integre','erreur') NOT NULL DEFAULT 'en_attente',
  `contenu_brut` longtext DEFAULT NULL,
  `contenu_revise` longtext DEFAULT NULL,
  `hash_contenu` char(64) DEFAULT NULL,
  `selected` tinyint(1) NOT NULL DEFAULT 1,
  `theme_id` int(11) unsigned DEFAULT NULL,
  `oeuvre_id` int(11) unsigned DEFAULT NULL,
  `citation_id` int(11) unsigned DEFAULT NULL,
  `date_publication` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_documents_lot_id` (`lot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- telegram_updates_buffer (post-010 + 011)
CREATE TABLE IF NOT EXISTS `telegram_updates_buffer` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `collect_source_id` int(10) unsigned DEFAULT NULL,
  `origin` enum('live','historique') NOT NULL DEFAULT 'live',
  `update_id` bigint(20) NOT NULL,
  `message_id` bigint(20) NOT NULL,
  `chat_id` bigint(20) NOT NULL,
  `chat_username` varchar(255) DEFAULT NULL,
  `message_date` datetime NOT NULL,
  `payload_json` longtext NOT NULL DEFAULT '{}',
  `buffer_status` enum('buffered','lot_created','ignored','error') NOT NULL DEFAULT 'buffered',
  `lot_id` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_telegram_updates_update_id` (`update_id`),
  KEY `idx_tub_origin` (`collect_source_id`, `origin`, `buffer_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- journal_events (post-010)
CREATE TABLE IF NOT EXISTS `journal_events` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lot_id` varchar(100) NOT NULL,
  `document_id` int(10) unsigned DEFAULT NULL,
  `actor` varchar(100) NOT NULL DEFAULT 'api',
  `action` varchar(100) NOT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- server_jobs (post-010)
CREATE TABLE IF NOT EXISTS `server_jobs` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `job_id` varchar(120) NOT NULL,
  `lot_id` varchar(100) NOT NULL,
  `document_id` int(10) unsigned DEFAULT NULL,
  `job_type` varchar(100) NOT NULL,
  `status` enum('queued','running','succeeded','failed','cancelled') NOT NULL DEFAULT 'queued',
  `priority` tinyint(3) unsigned NOT NULL DEFAULT 5,
  `attempts` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `max_attempts` tinyint(3) unsigned NOT NULL DEFAULT 3,
  `payload_json` longtext DEFAULT NULL,
  `result_json` longtext DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `locked_by` varchar(150) DEFAULT NULL,
  `locked_at` datetime DEFAULT NULL,
  `run_after` datetime NOT NULL DEFAULT current_timestamp(),
  `started_at` datetime DEFAULT NULL,
  `finished_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_server_jobs_job_id` (`job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- lot_document_keywords (post-010)
CREATE TABLE IF NOT EXISTS `lot_document_keywords` (
  `document_id` int(10) unsigned NOT NULL,
  `keyword_id` int(10) unsigned NOT NULL,
  `source` enum('manual','ai_suggested','ai_accepted') NOT NULL DEFAULT 'manual',
  PRIMARY KEY (`document_id`, `keyword_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
-- Fin fixture atelier test
