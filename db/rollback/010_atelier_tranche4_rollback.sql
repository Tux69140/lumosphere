-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Rollback 010 : annuler Tranche 4 atelier
-- ATTENTION : les données de status converties ne peuvent PAS être
-- restaurées vers les 14 anciennes valeurs. Ce rollback remet la
-- structure en place mais les valeurs de status restent mappées.
-- ═══════════════════════════════════════════════════════════════════

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;
SET FOREIGN_KEY_CHECKS = 0;

-- 5. CITATIONS : retirer lot_origin_id
ALTER TABLE citations DROP FOREIGN KEY fk_citations_lot_origin;
ALTER TABLE citations DROP KEY idx_citations_lot_origin;
ALTER TABLE citations DROP COLUMN lot_origin_id;

-- 4. JOURNAL_EVENTS : retirer actor_id
ALTER TABLE journal_events DROP FOREIGN KEY fk_journal_events_actor;
ALTER TABLE journal_events DROP COLUMN actor_id;

-- 3. LOT_DOCUMENT_KEYWORDS : supprimer la table
DROP TABLE IF EXISTS lot_document_keywords;

-- 2. DOCUMENTS : retirer les colonnes ajoutées
ALTER TABLE documents DROP FOREIGN KEY fk_documents_citation;
ALTER TABLE documents DROP FOREIGN KEY fk_documents_oeuvre;
ALTER TABLE documents DROP FOREIGN KEY fk_documents_theme;
ALTER TABLE documents DROP KEY idx_documents_citation;
ALTER TABLE documents DROP COLUMN citation_id;
ALTER TABLE documents DROP COLUMN oeuvre_id;
ALTER TABLE documents DROP COLUMN theme_id;
ALTER TABLE documents DROP COLUMN selected;
ALTER TABLE documents DROP COLUMN hash_contenu;
ALTER TABLE documents DROP COLUMN contenu_revise;
ALTER TABLE documents DROP COLUMN contenu_brut;
ALTER TABLE documents DROP COLUMN source_item_id;

-- 1. LOTS : retirer les colonnes et FK ajoutées
ALTER TABLE lots DROP FOREIGN KEY fk_lots_created_by;
ALTER TABLE lots DROP FOREIGN KEY fk_lots_assigned_to;
ALTER TABLE lots DROP COLUMN integrated_at;
ALTER TABLE lots DROP COLUMN error_message;
ALTER TABLE lots DROP COLUMN description;
ALTER TABLE lots DROP COLUMN created_by;

-- NOTE : les ENUM status (lots, documents, journal_events) ne sont PAS
-- restaurés aux 14 anciennes valeurs. Un rollback complet nécessiterait
-- de recréer les tables depuis le dump de référence.

-- schema_version
DELETE FROM schema_version WHERE version = 10;

SET FOREIGN_KEY_CHECKS = 1;
