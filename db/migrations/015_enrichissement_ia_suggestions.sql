-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Migration 015 : Enrichissement IA « suggéré / validé » (atelier)
-- Cible : MariaDB 11.4.12 (o2switch). À exécuter via phpMyAdmin (droits DDL).
-- Pré-requis : migrations 003–014 appliquées.
--
-- Modèle à 2 états partout (plus de 3e état « ai_accepted ») :
--   • suggéré par l'IA  → en attente de validation, ne rend jamais conforme
--   • manuel / humain   → validé (saisi à la main OU suggestion acceptée)
--
-- 1. documents.theme_suggested_id : thème proposé par l'IA, distinct du thème
--    validé (documents.theme_id). La conformité ne regarde que theme_id.
-- 2. lot_document_keywords.source : on retire 'ai_accepted'. Accepter une
--    suggestion = la ligne bascule en 'manual'.
-- ═══════════════════════════════════════════════════════════════════
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;

-- 1. Case « thème suggéré par l'IA » sur les documents
ALTER TABLE documents
    ADD COLUMN theme_suggested_id INT UNSIGNED NULL AFTER theme_id,
    ADD CONSTRAINT fk_documents_theme_suggested FOREIGN KEY (theme_suggested_id)
        REFERENCES themes (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Retrait de l'état 'ai_accepted' des mots-clés (migrer d'abord les lignes)
UPDATE lot_document_keywords SET source = 'manual' WHERE source = 'ai_accepted';
ALTER TABLE lot_document_keywords
    MODIFY COLUMN source ENUM('manual','ai_suggested') NOT NULL DEFAULT 'manual';

-- 3. Seed schema_version
INSERT INTO schema_version (version, description) VALUES
    (15, '015 — enrichissement IA : documents.theme_suggested_id + mots-clés source manual/ai_suggested');
-- Fin migration 015.
