-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Migration 005 : zone MODULES + nettoyage (Phase 3.4 + 3.5)
-- Cible : MariaDB 11.4.12 (o2switch), base mist2786_lumosphere, moteur InnoDB
-- À exécuter via phpMyAdmin avec un compte cPanel (droits DDL).
--   L'utilisateur applicatif mist2786_lumo_usr (SELECT/INSERT/UPDATE/DELETE)
--   ne peut PAS créer de tables.
--
-- Source : schema_T0.2_v4_sources_simple.dbml + devbook Phase 3.4/3.5
--
-- Décisions chef de projet (2026-06-22) :
--   - import_sources NON CRÉÉE : collect_sources = table unique de traçabilité
--   - telegram_channels NON CRÉÉE : config Telegram reste dans collect_sources
--   - collect_sources reçoit oeuvre_id (FK→oeuvres) + source_type étendu (pdf, other)
--   - citations.import_source_id pointe vers collect_sources (nom de colonne conservé)
--   - pivot_exports et sync_files supprimées (Phase 3.5, plus de pivot ni de synchro)
--
-- Conventions (identiques à 003/004) :
--   - id : INT UNSIGNED AUTO_INCREMENT (sauf config.cle et schema_version.version)
--   - updated_at : ON UPDATE CURRENT_TIMESTAMP
--   - charset utf8mb4, collation utf8mb4_unicode_520_ci
--   - FK ON DELETE selon sémantique, ON UPDATE CASCADE
-- ═══════════════════════════════════════════════════════════════════

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;
SET FOREIGN_KEY_CHECKS = 1;

-- ───────────────────────────────────────────────────────────────────
-- MEDIATHEQUE (fichiers média : images portraits, illustrations)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mediatheque (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  filename   VARCHAR(512) NOT NULL,
  alt        TEXT NULL,
  infos      TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- BIBLIOTHEQUE (exports générés : PDF et EPUB)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bibliotheque (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titre       VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type        ENUM('pdf','epub') NOT NULL,
  filename    VARCHAR(512) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- NOTIFICATIONS (formulaire de contact + suivi)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  statut      ENUM('Nouveau','En cours','Traité') NOT NULL DEFAULT 'Nouveau',
  notes_suivi TEXT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_statut (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- CONFIG (paramètres clé-valeur applicatifs)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config (
  cle    VARCHAR(100) NOT NULL,
  valeur TEXT NULL,
  PRIMARY KEY (cle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- EMOJIS (registre des codes emoji utilisés dans le contenu)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emojis (
  id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_emojis_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- EXPORT_JOBS (file d'attente des exports PDF/EPUB asynchrones)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS export_jobs (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  statut       ENUM('en_attente','en_cours','termine','erreur') NOT NULL DEFAULT 'en_attente',
  format       ENUM('pdf','epub') NOT NULL,
  filtres      LONGTEXT NULL CHECK (json_valid(filtres)),
  output_path  VARCHAR(512) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- SCHEMA_VERSION (suivi des migrations appliquées)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_version (
  version     INT UNSIGNED NOT NULL,
  description TEXT NULL,
  applied_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- USER_FAVORITES (favoris des utilisateurs connectés)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id     INT UNSIGNED NOT NULL,
  citation_id INT UNSIGNED NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, citation_id),
  KEY idx_user_favorites_citation (citation_id),
  CONSTRAINT fk_user_favorites_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_favorites_citation FOREIGN KEY (citation_id)
    REFERENCES citations (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- LOCAL_FAVORITES (favoris visiteur non connecté — réservé app bureau future)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS local_favorites (
  citation_id INT UNSIGNED NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (citation_id),
  CONSTRAINT fk_local_favorites_citation FOREIGN KEY (citation_id)
    REFERENCES citations (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- ALTER COLLECT_SOURCES : ajout oeuvre_id + extension source_type
-- collect_sources = table unique de traçabilité (import_sources abandonnée)
-- oeuvre_id NULL initialement (existants à renseigner manuellement)
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE collect_sources
  ADD COLUMN oeuvre_id INT UNSIGNED NULL AFTER enabled,
  ADD KEY idx_collect_sources_oeuvre (oeuvre_id),
  ADD CONSTRAINT fk_collect_sources_oeuvre FOREIGN KEY (oeuvre_id)
    REFERENCES oeuvres (id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE collect_sources
  MODIFY COLUMN source_type ENUM('telegram','youtube','html','pdf','other') NOT NULL;

-- ───────────────────────────────────────────────────────────────────
-- ALTER CITATIONS : fermeture de la FK différée (migration 003, lignes 150-153)
-- Pointe vers collect_sources (pas import_sources — table abandonnée).
-- Le nom de colonne import_source_id est conservé pour éviter de casser
-- les index existants (idx_citations_import_source, idx_citations_import_item).
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE citations
  ADD CONSTRAINT fk_citations_collect_source FOREIGN KEY (import_source_id)
    REFERENCES collect_sources (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ───────────────────────────────────────────────────────────────────
-- PHASE 3.5 : suppression des tables héritées du v1 (abandon pivot + synchro)
-- pivot_exports : remplacé par intégration directe au corpus (Phase 6.3)
-- sync_files : caduc en full-web (plus de synchro fichiers locaux ↔ serveur)
-- ───────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS pivot_exports;
DROP TABLE IF EXISTS sync_files;

-- ───────────────────────────────────────────────────────────────────
-- SEED : historique des migrations
-- ───────────────────────────────────────────────────────────────────
INSERT INTO schema_version (version, description) VALUES
  (3, '003 — corpus + fulltext (Phase 3.1/3.2)'),
  (4, '004 — auth (Phase 3.3)'),
  (5, '005 — modules + cleanup (Phase 3.4/3.5)');

-- Fin migration 005.
