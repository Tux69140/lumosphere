-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Migration 011 : Collecte manuelle + import historique (T40)
-- Cible : MariaDB 11.4.12 (o2switch). À exécuter via phpMyAdmin (droits DDL).
-- Pré-requis : migrations 003–010 appliquées.
-- ═══════════════════════════════════════════════════════════════════
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;

-- 1. Réserve : séparer les flux live / historique
ALTER TABLE telegram_updates_buffer
    ADD COLUMN origin ENUM('live','historique') NOT NULL DEFAULT 'live' AFTER collect_source_id,
    ADD KEY idx_tub_origin (collect_source_id, origin, buffer_status);

-- 2. Sources : interrupteur du tapis roulant historique
ALTER TABLE collect_sources
    ADD COLUMN history_import_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER enabled;

-- 3. Seed schema_version
INSERT INTO schema_version (version, description) VALUES
    (11, '011 — collecte manuelle : buffer.origin (live/historique), collect_sources.history_import_enabled');
-- Fin migration 011.
