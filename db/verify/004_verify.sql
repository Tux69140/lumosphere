-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Vérification migration 004 (Phase 3.3 — AUTH)
-- À exécuter APRÈS 004_auth.sql, sur mist2786_lumosphere.
-- Les sections sont indépendantes ; exécuter requête par requête dans
-- phpMyAdmin et comparer aux résultats attendus.
--
-- NOTE : toutes les tables sont préfixées mist2786_lumosphere.* pour
-- éviter les problèmes de contexte dans phpMyAdmin.
-- ═══════════════════════════════════════════════════════════════════

USE mist2786_lumosphere;

-- 1) Les 6 tables auth existent (doit retourner 6 lignes).
SELECT table_name, engine, table_collation
FROM information_schema.tables
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name IN ('roles','permissions','role_permissions',
                     'users','role_oeuvre_access','active_sessions')
ORDER BY table_name;

-- 2) Seed des rôles : 5 lignes, accents corrects.
-- Attendu : Administrateur(1), Éditeur(2), Visiteur(3), Abo3(4), Abo4(5)
SELECT id, nom FROM mist2786_lumosphere.roles ORDER BY id;

-- 3) Seed des permissions : 16 lignes.
SELECT id, code, description FROM mist2786_lumosphere.permissions ORDER BY id;

-- 4) Associations rôle↔permission : nombre attendu par rôle.
-- Attendu : Administrateur=16, Éditeur=11, Visiteur=1, Abo3=1, Abo4=1
SELECT r.nom AS role_nom, COUNT(*) AS nb_permissions
FROM mist2786_lumosphere.role_permissions rp
JOIN mist2786_lumosphere.roles r ON r.id = rp.role_id
GROUP BY r.nom
ORDER BY r.id;

-- 5) Table users vide (pas d'utilisateur initial).
-- Attendu : 0
SELECT COUNT(*) AS nb_users FROM mist2786_lumosphere.users;

-- 6) Structure de users : prenom + nom séparés.
-- Attendu : colonnes prenom et nom présentes, toutes deux VARCHAR(255) NOT NULL
DESCRIBE mist2786_lumosphere.users;

-- 7) Structure de active_sessions : journal complet.
-- Attendu : id, user_id, session_token_hash, ip, user_agent, last_seen,
--           invalidated_at, created_at
DESCRIBE mist2786_lumosphere.active_sessions;

-- ───────────────────────────────────────────────────────────────────
-- 8) Test intégrité FK : insertion user avec rôle inexistant → doit échouer.
--    Décommenter, exécuter, vérifier l'erreur, puis re-commenter.
-- ───────────────────────────────────────────────────────────────────
-- INSERT INTO mist2786_lumosphere.users (prenom, nom, email, password_hash, role_id)
-- VALUES ('Test', 'Test', 'test@test.fr', '$2y$10$fakehashfakehashfakehashfakehashfakehashfakehashfak', 999);
-- Attendu : ERREUR « Cannot add or update a child row: a foreign key constraint fails »

-- ───────────────────────────────────────────────────────────────────
-- 9) Test CASCADE : supprimer un rôle de test → ses permissions suivent.
-- ───────────────────────────────────────────────────────────────────
START TRANSACTION;

INSERT INTO mist2786_lumosphere.roles (nom) VALUES ('RôleTest004');
SET @rid = LAST_INSERT_ID();

INSERT INTO mist2786_lumosphere.role_permissions (role_id, permission_id) VALUES (@rid, 1);

-- Vérifier que l'association existe.
SELECT COUNT(*) AS avant_delete FROM mist2786_lumosphere.role_permissions WHERE role_id = @rid;

DELETE FROM mist2786_lumosphere.roles WHERE id = @rid;

-- Attendu : 0 (l'association a été supprimée en cascade).
SELECT COUNT(*) AS apres_delete FROM mist2786_lumosphere.role_permissions WHERE role_id = @rid;

ROLLBACK;

-- ───────────────────────────────────────────────────────────────────
-- 10) Droits applicatifs : vérifier via cPanel > Bases de données MySQL
--     que mist2786_lumo_usr a bien SELECT/INSERT/UPDATE/DELETE sur
--     mist2786_lumosphere. SHOW GRANTS inaccessible en mutualisé o2switch.
-- ───────────────────────────────────────────────────────────────────
