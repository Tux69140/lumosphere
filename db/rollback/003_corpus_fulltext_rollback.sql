-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Rollback migration 003 (zone CORPUS, Phase 3.1 + 3.2)
-- Annule 003_corpus_fulltext.sql. À exécuter via phpMyAdmin (compte cPanel).
-- ⚠️ DROP destructif : supprime les tables ET leurs données.
-- Ordre inverse des dépendances FK (les enfants d'abord).
-- ═══════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS citation_keywords;
DROP TABLE IF EXISTS citations;
DROP TABLE IF EXISTS keywords;
DROP TABLE IF EXISTS etats;
DROP TABLE IF EXISTS themes;
DROP TABLE IF EXISTS oeuvres;
DROP TABLE IF EXISTS auteurs;

SET FOREIGN_KEY_CHECKS = 1;
