-- ─────────────────────────────────────────────────────────────────────
-- ROLLBACK 006 — Supprimer le référentiel thèmes
-- ⚠️ Met theme_id = NULL dans toutes les citations liées (ON DELETE SET NULL)
-- ─────────────────────────────────────────────────────────────────────
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM themes;
ALTER TABLE themes AUTO_INCREMENT = 1;
SET FOREIGN_KEY_CHECKS = 1;
