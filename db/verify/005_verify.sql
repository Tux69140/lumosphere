-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Vérification migration 005 (Phase 3.4 + 3.5)
-- À exécuter APRÈS 005_modules.sql, sur mist2786_lumosphere.
-- Requêtes indépendantes, à exécuter une par une dans phpMyAdmin.
-- Toutes les tables préfixées mist2786_lumosphere.* (contexte phpMyAdmin).
-- ═══════════════════════════════════════════════════════════════════

USE mist2786_lumosphere;

-- 1) Les 9 nouvelles tables existent (doit retourner 9 lignes).
SELECT table_name, engine, table_collation
FROM information_schema.tables
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name IN ('mediatheque','bibliotheque','notifications','config',
                     'emojis','export_jobs','schema_version',
                     'user_favorites','local_favorites')
ORDER BY table_name;

-- 2) Structure des tables clés
DESCRIBE mist2786_lumosphere.notifications;
DESCRIBE mist2786_lumosphere.export_jobs;
DESCRIBE mist2786_lumosphere.user_favorites;
DESCRIBE mist2786_lumosphere.local_favorites;

-- 3) collect_sources : oeuvre_id ajouté + source_type étendu
DESCRIBE mist2786_lumosphere.collect_sources;

SELECT column_type
FROM information_schema.columns
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name = 'collect_sources'
  AND column_name = 'source_type';
-- Attendu : enum('telegram','youtube','html','pdf','other')

-- 4) FK collect_sources.oeuvre_id → oeuvres existe
SELECT constraint_name, column_name, referenced_table_name
FROM information_schema.key_column_usage
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name = 'collect_sources'
  AND referenced_table_name IS NOT NULL;
-- Attendu : fk_collect_sources_oeuvre → oeuvres

-- 5) FK citations.import_source_id → collect_sources existe
SELECT constraint_name, column_name, referenced_table_name
FROM information_schema.key_column_usage
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name = 'citations'
  AND column_name = 'import_source_id'
  AND referenced_table_name IS NOT NULL;
-- Attendu : fk_citations_collect_source → collect_sources

-- 6) pivot_exports et sync_files supprimées
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name IN ('pivot_exports', 'sync_files');
-- Attendu : 0 lignes

-- 7) schema_version : 3 entrées
SELECT version, description FROM mist2786_lumosphere.schema_version ORDER BY version;
-- Attendu : 3 lignes (versions 3, 4, 5)

-- 8) Test CASCADE user_favorites
START TRANSACTION;

INSERT INTO mist2786_lumosphere.users (prenom, nom, email, password_hash, role_id)
VALUES ('Test', 'Verify005', 'verify005@test.fr',
        '$2y$10$fakehashfakehashfakehashfakehashfakehashfakehashfak', 3);
SET @uid = LAST_INSERT_ID();

INSERT INTO mist2786_lumosphere.auteurs (nom) VALUES ('Auteur Verify 005');
SET @aid = LAST_INSERT_ID();
INSERT INTO mist2786_lumosphere.oeuvres (auteur_id, nom) VALUES (@aid, 'Oeuvre Verify 005');
SET @oid = LAST_INSERT_ID();
INSERT INTO mist2786_lumosphere.citations (contenu, oeuvre_id, etat_id)
VALUES ('Citation test 005', @oid, 1);
SET @cid = LAST_INSERT_ID();

INSERT INTO mist2786_lumosphere.user_favorites (user_id, citation_id) VALUES (@uid, @cid);
SELECT COUNT(*) AS avant_delete FROM mist2786_lumosphere.user_favorites WHERE user_id = @uid;
-- Attendu : 1

DELETE FROM mist2786_lumosphere.users WHERE id = @uid;
SELECT COUNT(*) AS apres_delete FROM mist2786_lumosphere.user_favorites WHERE user_id = @uid;
-- Attendu : 0 (supprimé en cascade)

ROLLBACK;

-- 9) Droits applicatifs : vérifier via cPanel > Bases de données MySQL
--    que mist2786_lumo_usr a SELECT/INSERT/UPDATE/DELETE sur mist2786_lumosphere.
