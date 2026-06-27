-- ═══════════════════════════════════════════════════════════════════
-- SEED 007 — Réglages applicatifs (Phase 3bis, part « maintenant »)
-- Idempotent : INSERT IGNORE
--   mode_debug_global      : '0' = OFF (défaut). '1' = conserve les dossiers de lots.
--   journal_retention_days : nb de jours avant élagage des entrées journal_events.
-- ═══════════════════════════════════════════════════════════════════
SET NAMES utf8mb4;

INSERT IGNORE INTO config (cle, valeur) VALUES
  ('mode_debug_global', '0'),
  ('journal_retention_days', '90');

INSERT INTO schema_version (version, description) VALUES
  (7, '007 — config seeds (mode_debug_global, journal_retention_days) [Phase 3bis]')
ON DUPLICATE KEY UPDATE description = VALUES(description);
