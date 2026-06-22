-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Rollback migration 005 (Phase 3.4 + 3.5 — MODULES + cleanup)
-- Annule 005_modules.sql. À exécuter via phpMyAdmin (compte cPanel).
-- ⚠️ DESTRUCTIF : supprime les tables ET leurs données, annule les ALTER.
-- NOTE : pivot_exports et sync_files ne sont PAS recréées (tables legacy
--   sans DDL dans l'historique des migrations).
-- ═══════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

-- 1) Retirer les FK ajoutées par ALTER
ALTER TABLE citations DROP FOREIGN KEY fk_citations_collect_source;

ALTER TABLE collect_sources DROP FOREIGN KEY fk_collect_sources_oeuvre;
ALTER TABLE collect_sources DROP KEY idx_collect_sources_oeuvre;
ALTER TABLE collect_sources DROP COLUMN oeuvre_id;
ALTER TABLE collect_sources
  MODIFY COLUMN source_type ENUM('telegram','youtube','html') NOT NULL;

-- 2) Supprimer les 9 nouvelles tables
DROP TABLE IF EXISTS local_favorites;
DROP TABLE IF EXISTS user_favorites;
DROP TABLE IF EXISTS schema_version;
DROP TABLE IF EXISTS export_jobs;
DROP TABLE IF EXISTS emojis;
DROP TABLE IF EXISTS config;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS bibliotheque;
DROP TABLE IF EXISTS mediatheque;

SET FOREIGN_KEY_CHECKS = 1;
