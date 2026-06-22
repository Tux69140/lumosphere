-- ─────────────────────────────────────────────────────────────────────
-- VERIFY 007 — Contrôle des réglages (toutes les colonnes doivent valoir 1)
-- ─────────────────────────────────────────────────────────────────────
SELECT COUNT(*) = 1 AS 'mode_debug_global présent et OFF'
  FROM config WHERE cle = 'mode_debug_global' AND valeur = '0';
SELECT COUNT(*) = 1 AS 'journal_retention_days = 90'
  FROM config WHERE cle = 'journal_retention_days' AND valeur = '90';
