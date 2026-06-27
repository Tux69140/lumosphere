-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Migration 004 : zone AUTH (Phase 3.3)
-- Cible : MariaDB 11.4.12 (o2switch), base mist2786_lumosphere, moteur InnoDB
-- À exécuter via phpMyAdmin avec un compte cPanel (droits DDL).
--   L'utilisateur applicatif mist2786_lumo_usr (SELECT/INSERT/UPDATE/DELETE)
--   ne peut PAS créer de tables.
--
-- Source : docs/_reference/index-corpus-schema/schema_T0.2_v4_sources_simple.dbml
--   (tables auth, lignes 139-209) + devbook Phase 3.3 + cahier des charges §5/§23-24.
--
-- Décisions chef de projet (2026-06-22) :
--   - users : champs prenom + nom séparés (devbook > DBML)
--   - active_sessions : journal complet (IP, device, invalidation admin)
--   - Permissions pré-remplies d'après le cahier des charges
--   - Pas d'utilisateur admin seedé (création sécurisée Phase 6.2)
--   - role_oeuvre_access : présence = accès lecture (pas de colonne access_level)
--
-- Conventions (identiques à 003) :
--   - id : INT UNSIGNED AUTO_INCREMENT
--   - updated_at : ON UPDATE CURRENT_TIMESTAMP
--   - charset utf8mb4, collation utf8mb4_unicode_520_ci
--   - FK ON DELETE selon sémantique, ON UPDATE CASCADE
-- ═══════════════════════════════════════════════════════════════════

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;
SET FOREIGN_KEY_CHECKS = 1;

-- ───────────────────────────────────────────────────────────────────
-- ROLES (5 rôles système — Administrateur id=1 protégé par la DAL)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom        VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

INSERT INTO roles (id, nom) VALUES
  (1, 'Administrateur'),
  (2, 'Éditeur'),
  (3, 'Visiteur'),
  (4, 'Abo3'),
  (5, 'Abo4');

-- ───────────────────────────────────────────────────────────────────
-- PERMISSIONS (codes d'action — associées aux rôles via role_permissions)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(100) NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

INSERT INTO permissions (id, code, description) VALUES
  (1,  'corpus.read',       'Lire les citations publiées'),
  (2,  'corpus.read_all',   'Lire toutes les citations (incluant brouillons)'),
  (3,  'corpus.write',      'Créer et modifier des citations'),
  (4,  'corpus.delete',     'Supprimer des citations (suppression douce)'),
  (5,  'admin.users',       'Gérer les utilisateurs'),
  (6,  'admin.roles',       'Gérer les rôles et permissions'),
  (7,  'admin.settings',    'Gérer la configuration applicative'),
  (8,  'oeuvres.manage',    'Créer et modifier les œuvres et auteurs'),
  (9,  'themes.manage',     'Gérer l''arborescence des thèmes'),
  (10, 'keywords.manage',   'Gérer les mots-clés'),
  (11, 'export.request',    'Demander un export PDF/EPUB'),
  (12, 'atelier.access',    'Accéder à l''atelier de préparation'),
  (13, 'atelier.lots',      'Prendre en charge et traiter des lots'),
  (14, 'atelier.validate',  'Valider un lot et intégrer au corpus'),
  (15, 'atelier.sources',   'Configurer les sources de collecte'),
  (16, 'admin.sessions',    'Voir l''historique des connexions et forcer une déconnexion');

-- ───────────────────────────────────────────────────────────────────
-- ROLE_PERMISSIONS (association rôle ↔ permission, N-N)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  KEY idx_role_permissions_permission (permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id)
    REFERENCES roles (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id)
    REFERENCES permissions (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- Administrateur : tous les droits
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),(1,11),(1,12),(1,13),(1,14),(1,15),(1,16);

-- Éditeur : corpus complet + gestion éditoriale + atelier complet + export
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (2,1),(2,2),(2,3),(2,4),(2,8),(2,9),(2,10),(2,11),(2,12),(2,13),(2,14);

-- Visiteur : lecture des citations publiées uniquement
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (3,1);

-- Abo3 : lecture des citations publiées (filtré par role_oeuvre_access)
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (4,1);

-- Abo4 : lecture des citations publiées (filtré par role_oeuvre_access)
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (5,1);

-- ───────────────────────────────────────────────────────────────────
-- USERS (pas d'utilisateur initial — premier admin créé en Phase 6.2)
-- password_hash : sortie bcrypt (60 chars), VARCHAR(255) par sécurité
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  prenom        VARCHAR(255) NOT NULL,
  nom           VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id       INT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role_id),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id)
    REFERENCES roles (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- ROLE_OEUVRE_ACCESS (accès en lecture par œuvre pour Abo3/Abo4)
-- Présence d'une ligne = le rôle peut lire cette œuvre.
-- Appliqué dans le WHERE SQL de chaque requête, pas en masquage UI.
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_oeuvre_access (
  role_id   INT UNSIGNED NOT NULL,
  oeuvre_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, oeuvre_id),
  KEY idx_role_oeuvre_access_oeuvre (oeuvre_id),
  CONSTRAINT fk_role_oeuvre_access_role FOREIGN KEY (role_id)
    REFERENCES roles (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_role_oeuvre_access_oeuvre FOREIGN KEY (oeuvre_id)
    REFERENCES oeuvres (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- ───────────────────────────────────────────────────────────────────
-- ACTIVE_SESSIONS (journal de connexions — visible admin uniquement)
-- Sert à : bandeau de présence éditeurs, historique connexions admin,
--   déconnexion forcée (invalidated_at non NULL = session révoquée).
-- Le stockage des sessions PHP reste en fichier natif (v1 mono-serveur).
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS active_sessions (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id            INT UNSIGNED NOT NULL,
  session_token_hash VARCHAR(64) NULL,
  ip                 VARCHAR(45) NULL,
  user_agent         VARCHAR(512) NULL,
  last_seen          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  invalidated_at     DATETIME NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_active_sessions_user (user_id),
  KEY idx_active_sessions_token (session_token_hash),
  CONSTRAINT fk_active_sessions_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- Fin migration 004.
