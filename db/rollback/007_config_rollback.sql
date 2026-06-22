-- ─────────────────────────────────────────────────────────────────────
-- ROLLBACK 007 — Retirer les réglages 3bis
-- ─────────────────────────────────────────────────────────────────────
DELETE FROM config WHERE cle IN ('mode_debug_global', 'journal_retention_days');
DELETE FROM schema_version WHERE version = 7;
