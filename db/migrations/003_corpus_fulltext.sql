-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Migration 003 : zone CORPUS éditorial (Phase 3.1 + 3.2)
-- Cible : MariaDB 11.4.12 (o2switch), base mist2786_lumosphere, moteur InnoDB
-- À exécuter via phpMyAdmin avec un compte cPanel (droits DDL).
--   L'utilisateur applicatif mist2786_lumo_usr (SELECT/INSERT/UPDATE/DELETE)
--   ne peut PAS créer de tables.
--
-- Source adaptée : docs/_reference/index-corpus-schema/
--   schema_T0.2_v2.sql (tables + seeds) + schema_T0.2_v4_sources_simple.dbml
--   (colonnes de provenance). Correspondances SQLite→MySQL : devbook Annexe C.
--
-- Choix transverses :
--   - id : INT UNSIGNED AUTO_INCREMENT
--   - updated_at : ON UPDATE CURRENT_TIMESTAMP (remplace les triggers SQLite)
--   - charset utf8mb4, collation accent-insensible utf8mb4_unicode_520_ci
--     (MariaDB ; la variante utf8mb4_0900_ai_ci est MySQL 8 uniquement)
--   - themes.chemin : colonne calculée EN PHP à l'écriture (pas de trigger)
--   - profondeur themes ≤ 2 niveaux : appliquée EN PHP (pas en SQL)
--   - recherche : index FULLTEXT InnoDB (pas de FTS5, pas de triggers FTS)
-- ═══════════════════════════════════════════════════════════════════

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;
SET FOREIGN_KEY_CHECKS = 1;

-- ───────────────────────────────────────────────────────────────────
-- AUTEURS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auteurs (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom          VARCHAR(255) NOT NULL,
  site         VARCHAR(512) NULL,
  informations TEXT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auteurs_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- OEUVRES (1 œuvre = 1 auteur — Décision B)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oeuvres (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  auteur_id    INT UNSIGNED NOT NULL,
  nom          VARCHAR(255) NOT NULL,
  abreviation  VARCHAR(64) NULL,
  url          VARCHAR(512) NULL,
  ref_libraire VARCHAR(128) NULL,
  description  TEXT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_oeuvres_auteur (auteur_id),
  KEY idx_oeuvres_ref_libraire (ref_libraire),
  CONSTRAINT fk_oeuvres_auteur FOREIGN KEY (auteur_id)
    REFERENCES auteurs (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- THEMES (arborescence ≤ 2 niveaux — profondeur appliquée par la DAL PHP)
-- chemin : matérialisé EN PHP à l'écriture (ex. "Spiritualité/Cosmologie")
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS themes (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom         VARCHAR(190) NOT NULL,
  parent_id   INT UNSIGNED NULL,
  chemin      VARCHAR(400) NULL,
  description TEXT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_themes_parent (parent_id),
  KEY idx_themes_nom (nom),
  CONSTRAINT fk_themes_parent FOREIGN KEY (parent_id)
    REFERENCES themes (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- ETATS de publication (états système non modifiables : est_modifiable=0)
-- Seed C/R/P avec accents corrects (la source SQLite les avait dégradés).
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS etats (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom            VARCHAR(50) NOT NULL,
  code           VARCHAR(4) NOT NULL,
  couleur        VARCHAR(16) NOT NULL,
  est_modifiable TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_etats_nom (nom),
  UNIQUE KEY uq_etats_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

INSERT INTO etats (id, nom, code, couleur, est_modifiable) VALUES
  (1, 'À Corriger', 'C', '#FFCCCC', 0),
  (2, 'À Réviser',  'R', '#FFFFAA', 0),
  (3, 'Publiée',    'P', '#CCFFCC', 0);

-- ───────────────────────────────────────────────────────────────────
-- KEYWORDS (unicité insensible à la casse via collation _ci)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS keywords (
  id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  mot VARCHAR(190) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_keywords_mot (mot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- CITATIONS (entité centrale du corpus) — Phase 3.1 + 3.2
--   - auteur_nom : colonne dénormalisée maintenue EN PHP à l'écriture (3.2)
--   - provenance générique : import_source_id / source_item_id / source_item_date
--     (la FK vers import_sources est différée en Phase 3.4)
--   - soft-delete : deleted_at (filtré WHERE deleted_at IS NULL partout)
--   - FULLTEXT (contenu, notes, auteur_nom) : recherche plein texte (remplace FTS5)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS citations (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  contenu             MEDIUMTEXT NOT NULL,
  notes               TEXT NULL,
  oeuvre_id           INT UNSIGNED NOT NULL,
  theme_id            INT UNSIGNED NULL,
  etat_id             INT UNSIGNED NOT NULL,
  auteur_nom          VARCHAR(255) NULL,
  telegram_message_id VARCHAR(190) NULL,
  import_source_id    INT UNSIGNED NULL,
  source_item_id      VARCHAR(255) NULL,
  source_item_date    DATETIME NULL,
  deleted_at          DATETIME NULL,
  date_entree         DATE NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_citations_oeuvre (oeuvre_id),
  KEY idx_citations_theme (theme_id),
  KEY idx_citations_etat (etat_id),
  KEY idx_citations_date (date_entree),
  KEY idx_citations_deleted (deleted_at),
  KEY idx_citations_import_source (import_source_id),
  KEY idx_citations_source_item_date (source_item_date),
  KEY idx_citations_etat_theme_date (etat_id, theme_id, date_entree),
  UNIQUE KEY idx_citations_tg_msg (telegram_message_id),
  UNIQUE KEY idx_citations_import_item (import_source_id, source_item_id),
  FULLTEXT KEY ft_citations (contenu, notes, auteur_nom),
  CONSTRAINT fk_citations_oeuvre FOREIGN KEY (oeuvre_id)
    REFERENCES oeuvres (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_citations_theme FOREIGN KEY (theme_id)
    REFERENCES themes (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_citations_etat FOREIGN KEY (etat_id)
    REFERENCES etats (id) ON DELETE RESTRICT ON UPDATE CASCADE
  -- NOTE Phase 3.4 : ajouter
  --   CONSTRAINT fk_citations_import_source FOREIGN KEY (import_source_id)
  --     REFERENCES import_sources (id) ON DELETE SET NULL ON UPDATE CASCADE
  -- une fois la table import_sources créée.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- CITATION_KEYWORDS (association N-N, PK composite, CASCADE)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS citation_keywords (
  citation_id INT UNSIGNED NOT NULL,
  keyword_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (citation_id, keyword_id),
  KEY idx_citation_keywords_keyword (keyword_id),
  CONSTRAINT fk_ck_citation FOREIGN KEY (citation_id)
    REFERENCES citations (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ck_keyword FOREIGN KEY (keyword_id)
    REFERENCES keywords (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- Fin migration 003.
