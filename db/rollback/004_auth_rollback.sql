-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Rollback migration 004 (Phase 3.3 — AUTH)
-- Annule 004_auth.sql. À exécuter via phpMyAdmin (compte cPanel).
-- ⚠️ DROP destructif : supprime les tables ET leurs données.
-- Ordre inverse des dépendances FK (les enfants d'abord).
-- ═══════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS active_sessions;
DROP TABLE IF EXISTS role_oeuvre_access;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;
