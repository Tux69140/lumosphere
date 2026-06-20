-- ═══════════════════════════════════════════════════════════════════
-- SCHÉMA SQL — Index Lulumineux
-- Généré depuis schema_T0.2_v2.dbml — 02/05/2026
--
-- Modifications par rapport au schéma initial :
--   1. themes.chemin         : champ calculé + triggers de synchronisation
--   2. telegram_channels.oeuvre_id : NOT NULL + delete RESTRICT (correction)
--   3. etats.est_modifiable  : champ documentant les états système
--   4. citations_fts         : notes ajoutées à l'index FTS5
--
-- PRAGMA exécutés à chaque connexion par la DAL (pas dans ce fichier) :
--   PRAGMA foreign_keys = ON;
--   PRAGMA journal_mode = WAL;
--   PRAGMA synchronous = NORMAL;
--   PRAGMA cache_size = -65536;
--   PRAGMA temp_store = MEMORY;
-- ═══════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────
-- VERSIONING MIGRATIONS
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE schema_version (
  version    INTEGER NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_version (version) VALUES (2);


-- ───────────────────────────────────────────────────────────────────
-- AUTEURS
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE auteurs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nom          TEXT NOT NULL,
  site         TEXT,
  informations TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_auteurs_nom ON auteurs(nom);


-- ───────────────────────────────────────────────────────────────────
-- OEUVRES (1 oeuvre = 1 auteur -- Décision B)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE oeuvres (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  auteur_id    INTEGER NOT NULL REFERENCES auteurs(id) ON DELETE RESTRICT,
  nom          TEXT NOT NULL,
  abreviation  TEXT,
  url          TEXT,
  ref_libraire TEXT,
  description  TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_oeuvres_auteur       ON oeuvres(auteur_id);
CREATE INDEX idx_oeuvres_ref_libraire ON oeuvres(ref_libraire);


-- ───────────────────────────────────────────────────────────────────
-- THEMES (arborescence 2 niveaux max -- profondeur enforced par la DAL)
-- MODIFICATION 1 : ajout de themes.chemin (champ calcule par triggers)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE themes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nom         TEXT NOT NULL,
  parent_id   INTEGER REFERENCES themes(id) ON DELETE SET NULL,
  chemin      TEXT,
  description TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_themes_parent ON themes(parent_id);
CREATE INDEX idx_themes_nom    ON themes(nom);

CREATE TRIGGER themes_chemin_insert
AFTER INSERT ON themes
BEGIN
  UPDATE themes
  SET chemin = CASE
    WHEN NEW.parent_id IS NULL THEN NEW.nom
    ELSE (SELECT chemin FROM themes WHERE id = NEW.parent_id) || '/' || NEW.nom
  END
  WHERE id = NEW.id;
END;

CREATE TRIGGER themes_chemin_update
AFTER UPDATE OF nom, parent_id ON themes
BEGIN
  UPDATE themes
  SET chemin = CASE
    WHEN NEW.parent_id IS NULL THEN NEW.nom
    ELSE (SELECT chemin FROM themes WHERE id = NEW.parent_id) || '/' || NEW.nom
  END
  WHERE id = NEW.id;

  UPDATE themes
  SET chemin = (SELECT chemin FROM themes WHERE id = NEW.id) || '/' || nom
  WHERE parent_id = NEW.id;
END;


-- ───────────────────────────────────────────────────────────────────
-- ETATS DE PUBLICATION
-- MODIFICATION 3 : ajout de etats.est_modifiable
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE etats (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nom            TEXT NOT NULL UNIQUE,
  code           TEXT NOT NULL UNIQUE,
  couleur        TEXT NOT NULL,
  est_modifiable INTEGER NOT NULL DEFAULT 1
);

INSERT INTO etats VALUES (1, 'A Corriger', 'C', '#FFCCCC', 0);
INSERT INTO etats VALUES (2, 'A Reviser',  'R', '#FFFFAA', 0);
INSERT INTO etats VALUES (3, 'Publiee',    'P', '#CCFFCC', 0);


-- ───────────────────────────────────────────────────────────────────
-- CITATIONS (entite centrale)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE citations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  contenu             TEXT NOT NULL,
  notes               TEXT,
  oeuvre_id           INTEGER NOT NULL REFERENCES oeuvres(id) ON DELETE RESTRICT,
  theme_id            INTEGER REFERENCES themes(id) ON DELETE SET NULL,
  etat_id             INTEGER NOT NULL REFERENCES etats(id) ON DELETE RESTRICT,
  telegram_message_id TEXT,
  deleted_at          DATETIME,
  date_entree         DATE,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_citations_oeuvre          ON citations(oeuvre_id);
CREATE INDEX idx_citations_theme           ON citations(theme_id);
CREATE INDEX idx_citations_etat            ON citations(etat_id);
CREATE INDEX idx_citations_date            ON citations(date_entree);
CREATE INDEX idx_citations_deleted         ON citations(deleted_at);
CREATE INDEX idx_citations_etat_theme_date ON citations(etat_id, theme_id, date_entree);
CREATE UNIQUE INDEX idx_citations_tg_msg   ON citations(telegram_message_id)
  WHERE telegram_message_id IS NOT NULL;

CREATE TRIGGER citations_updated_at
AFTER UPDATE ON citations
BEGIN
  UPDATE citations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;


-- ───────────────────────────────────────────────────────────────────
-- MOTS-CLES
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE keywords (
  id  INTEGER PRIMARY KEY AUTOINCREMENT,
  mot TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE citation_keywords (
  citation_id INTEGER NOT NULL REFERENCES citations(id) ON DELETE CASCADE,
  keyword_id  INTEGER NOT NULL REFERENCES keywords(id)  ON DELETE CASCADE,
  PRIMARY KEY (citation_id, keyword_id)
);
CREATE INDEX idx_citation_keywords_keyword ON citation_keywords(keyword_id);


-- ───────────────────────────────────────────────────────────────────
-- TABLE FTS5 (recherche plein texte)
-- MODIFICATION 4 : notes ajoutees a l'index
-- ───────────────────────────────────────────────────────────────────

CREATE VIRTUAL TABLE citations_fts USING fts5(
  contenu,
  notes,
  auteur_nom,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER citations_ai
AFTER INSERT ON citations
BEGIN
  INSERT INTO citations_fts(rowid, contenu, notes, auteur_nom)
  SELECT NEW.id,
         NEW.contenu,
         COALESCE(NEW.notes, ''),
         a.nom
  FROM auteurs a
  JOIN oeuvres o ON o.id = NEW.oeuvre_id
  WHERE a.id = o.auteur_id;
END;

CREATE TRIGGER citations_ad
AFTER DELETE ON citations
BEGIN
  INSERT INTO citations_fts(citations_fts, rowid, contenu, notes, auteur_nom)
  VALUES('delete', OLD.id, OLD.contenu, COALESCE(OLD.notes, ''),
    (SELECT a.nom FROM auteurs a
     JOIN oeuvres o ON o.id = OLD.oeuvre_id
     WHERE a.id = o.auteur_id));
END;

CREATE TRIGGER citations_au
AFTER UPDATE ON citations
BEGIN
  INSERT INTO citations_fts(citations_fts, rowid, contenu, notes, auteur_nom)
  VALUES('delete', OLD.id, OLD.contenu, COALESCE(OLD.notes, ''),
    (SELECT a.nom FROM auteurs a
     JOIN oeuvres o ON o.id = OLD.oeuvre_id
     WHERE a.id = o.auteur_id));
  INSERT INTO citations_fts(rowid, contenu, notes, auteur_nom)
  SELECT NEW.id,
         NEW.contenu,
         COALESCE(NEW.notes, ''),
         a.nom
  FROM auteurs a
  JOIN oeuvres o ON o.id = NEW.oeuvre_id
  WHERE a.id = o.auteur_id;
END;


-- ───────────────────────────────────────────────────────────────────
-- ROLES ET PERMISSIONS
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE roles (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nom        TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (nom) VALUES ('Administrateur');
INSERT INTO roles (nom) VALUES ('Editeur');

CREATE TABLE permissions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE role_permissions (
  role_id       INTEGER NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);


-- ───────────────────────────────────────────────────────────────────
-- UTILISATEURS
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nom           TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_role ON users(role_id);

-- Le compte admin par defaut est cree par le script d'initialisation
-- applicatif (pas ici) car le hash bcrypt necessite Node.js ou Rust.


-- ───────────────────────────────────────────────────────────────────
-- FAVORIS
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE user_favorites (
  user_id     INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  citation_id INTEGER NOT NULL REFERENCES citations(id) ON DELETE CASCADE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, citation_id)
);

CREATE TABLE local_favorites (
  citation_id INTEGER NOT NULL PRIMARY KEY
              REFERENCES citations(id) ON DELETE CASCADE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- ───────────────────────────────────────────────────────────────────
-- SESSIONS ACTIVES (bandeau presence simultanee des editeurs)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE active_sessions (
  user_id   INTEGER NOT NULL PRIMARY KEY
            REFERENCES users(id) ON DELETE CASCADE,
  prenom    TEXT NOT NULL,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- ───────────────────────────────────────────────────────────────────
-- MEDIATHEQUE
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE mediatheque (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  filename   TEXT NOT NULL,
  alt        TEXT,
  infos      TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- ───────────────────────────────────────────────────────────────────
-- BIBLIOTHEQUE
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE bibliotheque (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  titre       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL CHECK(type IN ('pdf', 'epub')),
  filename    TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- ───────────────────────────────────────────────────────────────────
-- NOTIFICATIONS VISITEURS
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL,
  message     TEXT NOT NULL,
  statut      TEXT NOT NULL DEFAULT 'Nouveau'
              CHECK(statut IN ('Nouveau', 'En cours', 'Traite')),
  notes_suivi TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_statut ON notifications(statut);


-- ───────────────────────────────────────────────────────────────────
-- CANAUX TELEGRAM
-- MODIFICATION 2 : oeuvre_id NOT NULL + delete RESTRICT
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE telegram_channels (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nom            TEXT NOT NULL,
  channel_id     TEXT NOT NULL UNIQUE,
  oeuvre_id      INTEGER NOT NULL REFERENCES oeuvres(id) ON DELETE RESTRICT,
  last_import_at DATETIME
);


-- ───────────────────────────────────────────────────────────────────
-- CONFIGURATION GENERALE
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE config (
  cle    TEXT PRIMARY KEY,
  valeur TEXT
);

INSERT INTO config (cle, valeur) VALUES ('langue', 'fr');
INSERT INTO config (cle, valeur) VALUES ('theme_interface', 'clair');
INSERT INTO config (cle, valeur) VALUES ('db_update_interval_days', '3');


-- ───────────────────────────────────────────────────────────────────
-- EMOJIS
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE emojis (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE
);


-- ───────────────────────────────────────────────────────────────────
-- FILE D'ATTENTE EXPORTS (Phase 3)
-- Creee des l'init pour eviter une migration ulterieure.
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE export_jobs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  statut       TEXT NOT NULL DEFAULT 'en_attente'
               CHECK(statut IN ('en_attente', 'en_cours', 'termine', 'erreur')),
  format       TEXT NOT NULL CHECK(format IN ('pdf', 'epub')),
  filtres      TEXT,
  output_path  TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);
