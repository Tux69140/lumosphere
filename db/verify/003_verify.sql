-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Vérification migration 003 (Phase 3.1 + 3.2)
-- À exécuter APRÈS 003_corpus_fulltext.sql, sur mist2786_lumosphere.
-- Les sections sont indépendantes ; exécuter requête par requête dans
-- phpMyAdmin et comparer aux résultats attendus.
-- ═══════════════════════════════════════════════════════════════════

-- 1) Les 7 tables corpus existent (doit retourner 7 lignes).
SELECT table_name, engine, table_collation
FROM information_schema.tables
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name IN ('auteurs','oeuvres','themes','etats',
                     'citations','keywords','citation_keywords')
ORDER BY table_name;

-- 2) Seed des états : 3 lignes C/R/P, accents corrects, est_modifiable=0.
SELECT id, nom, code, couleur, est_modifiable FROM etats ORDER BY id;

-- 3) L'index FULLTEXT existe bien sur citations.
SELECT index_name, column_name, index_type
FROM information_schema.statistics
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name = 'citations'
  AND index_type = 'FULLTEXT'
ORDER BY seq_in_index;

-- ───────────────────────────────────────────────────────────────────
-- 4) Test accent-insensibilité + FULLTEXT (insert temporaire puis rollback).
--    « eveil » (sans accent) doit retrouver « éveil » (avec accent).
-- ───────────────────────────────────────────────────────────────────
START TRANSACTION;

INSERT INTO auteurs (nom) VALUES ('Auteur Test 003');
SET @aid = LAST_INSERT_ID();

INSERT INTO oeuvres (auteur_id, nom) VALUES (@aid, 'Œuvre Test 003');
SET @oid = LAST_INSERT_ID();

INSERT INTO citations (contenu, oeuvre_id, etat_id, auteur_nom)
VALUES ('Un texte sur l''éveil intérieur.', @oid, 1, 'Auteur Test 003');

-- Attendu : 1 ligne retournée (la recherche sans accent trouve « éveil »).
SELECT id, contenu
FROM citations
WHERE MATCH(contenu, notes, auteur_nom) AGAINST('eveil' IN NATURAL LANGUAGE MODE);

ROLLBACK;  -- aucune donnée de test conservée.

-- ───────────────────────────────────────────────────────────────────
-- 5) Droits applicatifs : le GRANT de mist2786_lumo_usr doit être au niveau
--    base (mist2786_lumosphere.*) pour couvrir automatiquement ces tables.
--    À exécuter avec un compte ayant accès à mysql.* (sinon : cPanel > MySQL).
-- ───────────────────────────────────────────────────────────────────
SHOW GRANTS FOR 'mist2786_lumo_usr'@'localhost';
