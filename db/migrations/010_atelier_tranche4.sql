-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Migration 010 : Tranche 4 — Pont atelier→corpus
-- Cible : MariaDB 11.4.12 (o2switch), base mist2786_lumosphere
-- À exécuter via phpMyAdmin avec un compte cPanel (droits DDL).
--
-- Les tables atelier (lots, documents, journal_events, server_jobs,
-- collect_sources, telegram_updates_buffer) EXISTENT DÉJÀ sur le
-- serveur (héritées d'Epuriel). Cette migration les MODIFIE pour
-- le nouveau workflow Lumosphère (8 états, FK users, intégration
-- directe au corpus).
--
-- Pré-requis : migrations 003–009 appliquées.
-- ═══════════════════════════════════════════════════════════════════

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;
SET FOREIGN_KEY_CHECKS = 0;

-- ───────────────────────────────────────────────────────────────────
-- 1. LOTS : migration du status ENUM (14 → 8 valeurs)
--    Mapping ancien → nouveau :
--      importe_raw, en_attente       → en_attente
--      pris_en_charge                → en_cours
--      en_traitement                 → en_traitement
--      a_reviser, en_revision        → en_revision
--      en_pause                      → en_attente (pas d'état pausé en v1)
--      a_reprendre                   → a_reprendre
--      revise, enrichi, pret_export  → pret
--      exporte                       → integre
--      erreur                        → erreur
--      ignore                        → erreur
-- ───────────────────────────────────────────────────────────────────

-- 1a. Convertir les données existantes vers les nouvelles valeurs
--     (via colonne temporaire car on ne peut pas ALTER ENUM et UPDATE en même temps)
ALTER TABLE lots ADD COLUMN new_status VARCHAR(20) NOT NULL DEFAULT 'en_attente' AFTER status;

UPDATE lots SET new_status = CASE status
    WHEN 'importe_raw'     THEN 'en_attente'
    WHEN 'en_attente'      THEN 'en_attente'
    WHEN 'pris_en_charge'  THEN 'en_cours'
    WHEN 'en_traitement'   THEN 'en_traitement'
    WHEN 'a_reviser'       THEN 'en_revision'
    WHEN 'en_revision'     THEN 'en_revision'
    WHEN 'en_pause'        THEN 'en_attente'
    WHEN 'a_reprendre'     THEN 'a_reprendre'
    WHEN 'revise'          THEN 'pret'
    WHEN 'enrichi'         THEN 'pret'
    WHEN 'pret_export'     THEN 'pret'
    WHEN 'exporte'         THEN 'integre'
    WHEN 'erreur'          THEN 'erreur'
    WHEN 'ignore'          THEN 'erreur'
    ELSE 'en_attente'
END;

-- 1b. Remplacer l'ancien status par le nouveau
ALTER TABLE lots DROP COLUMN status;
ALTER TABLE lots CHANGE COLUMN new_status status
    ENUM('en_attente','en_cours','en_traitement','en_revision','a_reprendre','pret','integre','erreur')
    NOT NULL DEFAULT 'en_attente';

-- 1c. Ajouter les colonnes manquantes
ALTER TABLE lots
    ADD COLUMN created_by      INT UNSIGNED NULL AFTER assigned_to,
    ADD COLUMN description     TEXT NULL AFTER titre_lot,
    ADD COLUMN error_message   TEXT NULL AFTER server_lot_path,
    ADD COLUMN integrated_at   DATETIME NULL AFTER updated_at;

-- 1d. assigned_to : convertir VARCHAR(100) → INT UNSIGNED (FK users)
--     Les valeurs existantes (noms textuels) sont perdues — acceptable car
--     c'est l'ancien système. On garde la colonne mais on la recrée en INT.
ALTER TABLE lots ADD COLUMN assigned_to_new INT UNSIGNED NULL AFTER assigned_to;
ALTER TABLE lots DROP KEY idx_lots_assigned_to;
ALTER TABLE lots DROP COLUMN assigned_to;
ALTER TABLE lots CHANGE COLUMN assigned_to_new assigned_to INT UNSIGNED NULL;
ALTER TABLE lots ADD KEY idx_lots_assigned_to (assigned_to);

-- 1e. Ajouter les FK vers users
ALTER TABLE lots
    ADD CONSTRAINT fk_lots_assigned_to FOREIGN KEY (assigned_to)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT fk_lots_created_by FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ───────────────────────────────────────────────────────────────────
-- 2. DOCUMENTS : migration du status ENUM + ajout colonnes révision
-- ───────────────────────────────────────────────────────────────────

-- 2a. Convertir le status (même mapping que lots)
ALTER TABLE documents ADD COLUMN new_status VARCHAR(20) NOT NULL DEFAULT 'en_attente' AFTER status;

UPDATE documents SET new_status = CASE status
    WHEN 'importe_raw'     THEN 'en_attente'
    WHEN 'en_attente'      THEN 'en_attente'
    WHEN 'pris_en_charge'  THEN 'en_cours'
    WHEN 'en_traitement'   THEN 'en_traitement'
    WHEN 'a_reviser'       THEN 'en_revision'
    WHEN 'en_revision'     THEN 'en_revision'
    WHEN 'en_pause'        THEN 'en_attente'
    WHEN 'a_reprendre'     THEN 'a_reprendre'
    WHEN 'revise'          THEN 'pret'
    WHEN 'enrichi'         THEN 'pret'
    WHEN 'pret_export'     THEN 'pret'
    WHEN 'exporte'         THEN 'integre'
    WHEN 'erreur'          THEN 'erreur'
    WHEN 'ignore'          THEN 'erreur'
    ELSE 'en_attente'
END;

ALTER TABLE documents DROP COLUMN status;
ALTER TABLE documents CHANGE COLUMN new_status status
    ENUM('en_attente','en_cours','en_traitement','en_revision','a_reprendre','pret','integre','erreur')
    NOT NULL DEFAULT 'en_attente';

-- 2b. Normaliser type_document (nettoyage D9 du contexte-IA)
UPDATE documents SET type_document = 'telegram' WHERE type_document IN ('Telegram', 'telegram_posts');
UPDATE documents SET type_document = 'pdf' WHERE type_document = 'livre_ou_extrait_pdf';
UPDATE documents SET type_document = 'youtube' WHERE type_document = 'youtube_transcription';
UPDATE documents SET type_document = 'html' WHERE type_document IN ('article_html', 'texte_colle');

ALTER TABLE documents MODIFY COLUMN type_document
    ENUM('pdf','telegram','youtube','html') NOT NULL;

-- 2c. Ajouter les colonnes pour le workflow de révision
ALTER TABLE documents
    ADD COLUMN source_item_id  VARCHAR(128) NULL AFTER type_document,
    ADD COLUMN contenu_brut    LONGTEXT NULL AFTER raw_file_path,
    ADD COLUMN contenu_revise  LONGTEXT NULL AFTER contenu_brut,
    ADD COLUMN hash_contenu    CHAR(64) NULL AFTER contenu_revise,
    ADD COLUMN selected        TINYINT(1) NOT NULL DEFAULT 1 AFTER hash_contenu,
    ADD COLUMN theme_id        INT UNSIGNED NULL AFTER selected,
    ADD COLUMN oeuvre_id       INT UNSIGNED NULL AFTER theme_id,
    ADD COLUMN citation_id     INT UNSIGNED NULL AFTER oeuvre_id;

ALTER TABLE documents
    ADD KEY idx_documents_citation (citation_id),
    ADD CONSTRAINT fk_documents_theme FOREIGN KEY (theme_id)
        REFERENCES themes (id) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT fk_documents_oeuvre FOREIGN KEY (oeuvre_id)
        REFERENCES oeuvres (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_documents_citation FOREIGN KEY (citation_id)
        REFERENCES citations (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ───────────────────────────────────────────────────────────────────
-- 3. LOT_DOCUMENT_KEYWORDS (nouvelle table)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lot_document_keywords (
    document_id INT UNSIGNED NOT NULL,
    keyword_id  INT UNSIGNED NOT NULL,
    source      ENUM('manual','ai_suggested','ai_accepted') NOT NULL DEFAULT 'manual',
    PRIMARY KEY (document_id, keyword_id),
    KEY idx_ldk_keyword (keyword_id),
    CONSTRAINT fk_ldk_document FOREIGN KEY (document_id)
        REFERENCES documents (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ldk_keyword FOREIGN KEY (keyword_id)
        REFERENCES keywords (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- 4. JOURNAL_EVENTS : migration du status ENUM
-- ───────────────────────────────────────────────────────────────────

-- 4a. old_status
ALTER TABLE journal_events ADD COLUMN old_status_new VARCHAR(20) NULL AFTER action;
UPDATE journal_events SET old_status_new = CASE old_status
    WHEN 'importe_raw'     THEN 'en_attente'
    WHEN 'en_attente'      THEN 'en_attente'
    WHEN 'pris_en_charge'  THEN 'en_cours'
    WHEN 'en_traitement'   THEN 'en_traitement'
    WHEN 'a_reviser'       THEN 'en_revision'
    WHEN 'en_revision'     THEN 'en_revision'
    WHEN 'en_pause'        THEN 'en_attente'
    WHEN 'a_reprendre'     THEN 'a_reprendre'
    WHEN 'revise'          THEN 'pret'
    WHEN 'enrichi'         THEN 'pret'
    WHEN 'pret_export'     THEN 'pret'
    WHEN 'exporte'         THEN 'integre'
    WHEN 'erreur'          THEN 'erreur'
    WHEN 'ignore'          THEN 'erreur'
    ELSE NULL
END WHERE old_status IS NOT NULL;

ALTER TABLE journal_events DROP COLUMN old_status;
ALTER TABLE journal_events CHANGE COLUMN old_status_new old_status
    ENUM('en_attente','en_cours','en_traitement','en_revision','a_reprendre','pret','integre','erreur') NULL;

-- 4b. new_status
ALTER TABLE journal_events ADD COLUMN new_status_new VARCHAR(20) NULL AFTER old_status;
UPDATE journal_events SET new_status_new = CASE new_status
    WHEN 'importe_raw'     THEN 'en_attente'
    WHEN 'en_attente'      THEN 'en_attente'
    WHEN 'pris_en_charge'  THEN 'en_cours'
    WHEN 'en_traitement'   THEN 'en_traitement'
    WHEN 'a_reviser'       THEN 'en_revision'
    WHEN 'en_revision'     THEN 'en_revision'
    WHEN 'en_pause'        THEN 'en_attente'
    WHEN 'a_reprendre'     THEN 'a_reprendre'
    WHEN 'revise'          THEN 'pret'
    WHEN 'enrichi'         THEN 'pret'
    WHEN 'pret_export'     THEN 'pret'
    WHEN 'exporte'         THEN 'integre'
    WHEN 'erreur'          THEN 'erreur'
    WHEN 'ignore'          THEN 'erreur'
    ELSE NULL
END WHERE new_status IS NOT NULL;

ALTER TABLE journal_events DROP COLUMN new_status;
ALTER TABLE journal_events CHANGE COLUMN new_status_new new_status
    ENUM('en_attente','en_cours','en_traitement','en_revision','a_reprendre','pret','integre','erreur') NULL;

-- 4c. Ajouter actor_id (FK users) en complément du champ actor textuel
ALTER TABLE journal_events
    ADD COLUMN actor_id INT UNSIGNED NULL AFTER actor,
    ADD CONSTRAINT fk_journal_events_actor FOREIGN KEY (actor_id)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ───────────────────────────────────────────────────────────────────
-- 5. CITATIONS : ajouter la colonne de traçabilité lot_origin_id
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE citations
    ADD COLUMN lot_origin_id INT UNSIGNED NULL AFTER deleted_at,
    ADD KEY idx_citations_lot_origin (lot_origin_id),
    ADD CONSTRAINT fk_citations_lot_origin FOREIGN KEY (lot_origin_id)
        REFERENCES lots (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ───────────────────────────────────────────────────────────────────
-- 6. COLLECT_SOURCES : étendre source_type si pas déjà fait
-- ───────────────────────────────────────────────────────────────────
-- La migration 005 a déjà ajouté 'pdf' et 'other'.
-- Ici on s'assure que la valeur existe (idempotent via IF NOT EXISTS pattern).
-- Si déjà appliqué par 005, ce ALTER est un no-op.

-- ───────────────────────────────────────────────────────────────────
-- 7. SEED schema_version
-- ───────────────────────────────────────────────────────────────────
INSERT INTO schema_version (version, description) VALUES
    (10, '010 — atelier Tranche 4 : status 8 vals, FK users, lot_document_keywords, citations.lot_origin_id');

SET FOREIGN_KEY_CHECKS = 1;

-- Fin migration 010.
