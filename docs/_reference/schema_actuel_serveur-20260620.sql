/*M!999999\- enable the sandbox mode */ 

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;
DROP TABLE IF EXISTS `collect_sources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `collect_sources` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `source_type` enum('telegram','youtube','html') NOT NULL,
  `label` varchar(255) NOT NULL,
  `config_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`config_json`)),
  `first_marker` date DEFAULT NULL,
  `last_marker` date DEFAULT NULL,
  `last_update_id` bigint(20) DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `run_every_hours` tinyint(3) unsigned NOT NULL DEFAULT 12,
  `run_every_days` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `last_run_at` datetime DEFAULT NULL,
  `last_error` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_collect_sources_source_type` (`source_type`),
  KEY `idx_collect_sources_enabled` (`enabled`),
  CONSTRAINT `chk_collect_sources_run_every_days` CHECK (`run_every_days` between 1 and 31)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sources surveillees par les collecteurs';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lot_id` varchar(100) NOT NULL,
  `titre` varchar(500) NOT NULL DEFAULT '',
  `type_document` enum('pdf','telegram','youtube','html','Telegram','livre_ou_extrait_pdf','telegram_posts','youtube_transcription','article_html','texte_colle') NOT NULL,
  `status` enum('importe_raw','en_attente','pris_en_charge','en_traitement','a_reviser','en_revision','en_pause','a_reprendre','revise','enrichi','pret_export','exporte','erreur','ignore') NOT NULL DEFAULT 'importe_raw',
  `current_step` varchar(50) NOT NULL DEFAULT '0_raw',
  `revision_version` smallint(5) unsigned NOT NULL DEFAULT 0,
  `hash_source` char(64) DEFAULT NULL,
  `hash_texte_normalise` char(64) DEFAULT NULL,
  `raw_file_path` varchar(1000) DEFAULT NULL,
  `pivot_file_path` varchar(1000) DEFAULT NULL,
  `date_publication` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_documents_lot_id` (`lot_id`),
  KEY `idx_documents_status` (`status`),
  KEY `idx_documents_type_document` (`type_document`),
  CONSTRAINT `fk_documents_lot_id` FOREIGN KEY (`lot_id`) REFERENCES `lots` (`lot_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Documents contenus dans les lots';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ia_model_catalog_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ia_model_catalog_cache` (
  `provider` varchar(64) NOT NULL,
  `catalog_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`catalog_json`)),
  `refreshed_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `last_error` text DEFAULT NULL,
  `updated_by` varchar(128) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ia_model_registry`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ia_model_registry` (
  `provider` varchar(64) NOT NULL,
  `model_id` varchar(191) NOT NULL,
  `label` varchar(191) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `access_tier` varchar(16) NOT NULL DEFAULT 'unknown',
  `pricing_input_per_million_usd` decimal(10,4) DEFAULT NULL,
  `pricing_output_per_million_usd` decimal(10,4) DEFAULT NULL,
  `pricing_source` varchar(32) NOT NULL DEFAULT 'unknown',
  `notes` text DEFAULT NULL,
  `is_visible_with_key` tinyint(1) NOT NULL DEFAULT 0,
  `last_seen_at` datetime DEFAULT NULL,
  `last_refreshed_at` datetime DEFAULT NULL,
  `updated_by` varchar(128) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`provider`,`model_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ia_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ia_settings` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `scope` varchar(50) NOT NULL DEFAULT 'server_default',
  `mode_ia` enum('cloud') NOT NULL DEFAULT 'cloud',
  `provider` varchar(50) NOT NULL,
  `model` varchar(255) NOT NULL,
  `timeout_seconds` smallint(5) unsigned NOT NULL DEFAULT 45,
  `max_retries` tinyint(3) unsigned NOT NULL DEFAULT 2,
  `api_key` text DEFAULT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `prompt_keywords` text DEFAULT NULL,
  `prompt_theme` text DEFAULT NULL,
  `prompt_synonyms` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ia_settings_scope` (`scope`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuration IA active pour Epuriel';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `journal_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal_events` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lot_id` varchar(100) NOT NULL,
  `document_id` int(10) unsigned DEFAULT NULL,
  `actor` varchar(100) NOT NULL DEFAULT 'api',
  `action` varchar(100) NOT NULL,
  `old_status` enum('importe_raw','en_attente','pris_en_charge','en_traitement','a_reviser','en_revision','en_pause','a_reprendre','revise','enrichi','pret_export','exporte','erreur','ignore') DEFAULT NULL,
  `new_status` enum('importe_raw','en_attente','pris_en_charge','en_traitement','a_reviser','en_revision','en_pause','a_reprendre','revise','enrichi','pret_export','exporte','erreur','ignore') DEFAULT NULL,
  `message` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_journal_events_lot_id` (`lot_id`),
  KEY `idx_journal_events_document_id` (`document_id`),
  KEY `idx_journal_events_action` (`action`),
  KEY `idx_journal_events_created_at` (`created_at`),
  CONSTRAINT `fk_journal_events_document_id` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_journal_events_lot_id` FOREIGN KEY (`lot_id`) REFERENCES `lots` (`lot_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=284 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Journal officiel des actions importantes';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `lots` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lot_id` varchar(100) NOT NULL,
  `source_type` enum('pdf','telegram','youtube','html') NOT NULL,
  `source_id` int(11) DEFAULT NULL,
  `titre_lot` varchar(500) NOT NULL DEFAULT '',
  `status` enum('importe_raw','en_attente','pris_en_charge','en_traitement','a_reviser','en_revision','en_pause','a_reprendre','revise','enrichi','pret_export','exporte','erreur','ignore') NOT NULL DEFAULT 'importe_raw',
  `assigned_to` varchar(100) DEFAULT NULL,
  `last_editor` varchar(100) DEFAULT NULL,
  `current_step` varchar(50) NOT NULL DEFAULT '0_raw',
  `server_lot_path` varchar(1000) NOT NULL DEFAULT '',
  `date_source_debut` date NOT NULL,
  `date_source_fin` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_sync_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lots_lot_id` (`lot_id`),
  KEY `idx_lots_status` (`status`),
  KEY `idx_lots_source_type` (`source_type`),
  KEY `idx_lots_assigned_to` (`assigned_to`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registre officiel des lots documentaires';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pivot_exports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pivot_exports` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lot_id` varchar(100) NOT NULL,
  `document_id` int(10) unsigned DEFAULT NULL,
  `id_pivot` varchar(150) NOT NULL,
  `pivot_version` smallint(5) unsigned NOT NULL DEFAULT 1,
  `pivot_file_path` varchar(1000) NOT NULL,
  `hash_pivot` char(64) DEFAULT NULL,
  `status` enum('genere','importe_lumosphere','erreur') NOT NULL DEFAULT 'genere',
  `exported_at` datetime NOT NULL DEFAULT current_timestamp(),
  `imported_in_lumosphere_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pivot_exports_id_version` (`id_pivot`,`pivot_version`),
  KEY `idx_pivot_exports_lot_id` (`lot_id`),
  KEY `idx_pivot_exports_document_id` (`document_id`),
  KEY `idx_pivot_exports_status` (`status`),
  CONSTRAINT `fk_pivot_exports_document_id` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pivot_exports_lot_id` FOREIGN KEY (`lot_id`) REFERENCES `lots` (`lot_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historique des exports pivot';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `server_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `server_jobs` (
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
  UNIQUE KEY `uq_job_id` (`job_id`),
  KEY `idx_status_run_after` (`status`,`run_after`),
  KEY `idx_lot_id` (`lot_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_job_type` (`job_type`),
  CONSTRAINT `fk_server_jobs_document_id` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_server_jobs_lot_id` FOREIGN KEY (`lot_id`) REFERENCES `lots` (`lot_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='File de travaux serveur lances par cron';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sync_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sync_files` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lot_id` varchar(100) NOT NULL,
  `file_role` varchar(100) NOT NULL,
  `local_path` varchar(1000) NOT NULL,
  `server_path` varchar(1000) NOT NULL,
  `hash_local` char(64) DEFAULT NULL,
  `hash_server` char(64) DEFAULT NULL,
  `sync_status` enum('a_envoyer','synchronise','conflit','erreur') NOT NULL DEFAULT 'a_envoyer',
  `last_error` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sync_files_lot_id` (`lot_id`),
  KEY `idx_sync_files_sync_status` (`sync_status`),
  CONSTRAINT `fk_sync_files_lot_id` FOREIGN KEY (`lot_id`) REFERENCES `lots` (`lot_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Suivi des fichiers synchronises entre local et serveur';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `telegram_updates_buffer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `telegram_updates_buffer` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `collect_source_id` int(10) unsigned DEFAULT NULL,
  `update_id` bigint(20) NOT NULL,
  `message_id` bigint(20) NOT NULL,
  `chat_id` bigint(20) NOT NULL,
  `chat_username` varchar(255) DEFAULT NULL,
  `message_date` datetime NOT NULL,
  `payload_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload_json`)),
  `buffer_status` enum('buffered','lot_created','ignored','error') NOT NULL DEFAULT 'buffered',
  `lot_id` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_telegram_updates_update_id` (`update_id`),
  KEY `idx_telegram_updates_message_date` (`message_date`),
  KEY `idx_telegram_updates_status` (`buffer_status`),
  KEY `idx_telegram_updates_lot_id` (`lot_id`),
  KEY `fk_telegram_updates_collect_source` (`collect_source_id`),
  CONSTRAINT `fk_telegram_updates_collect_source` FOREIGN KEY (`collect_source_id`) REFERENCES `collect_sources` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tampon des posts Telegram recus par le bot';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

