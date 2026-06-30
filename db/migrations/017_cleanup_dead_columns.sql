-- Lumosphère — Migration 017 : nettoyage colonnes mortes / doublons (audit BDD)
-- 17 colonnes sans usage code + table local_favorites abandonnée (vide, vérifiée).
-- Idempotent (IF EXISTS) — MariaDB 11.4. Aucun impact données.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;

-- Fantômes hors-migration ; prompts gérés par ai_prompts
ALTER TABLE ia_settings
  DROP COLUMN IF EXISTS api_key,
  DROP COLUMN IF EXISTS prompt_keywords,
  DROP COLUMN IF EXISTS prompt_theme,
  DROP COLUMN IF EXISTS prompt_synonyms,
  DROP COLUMN IF EXISTS mode_ia;

-- Doublons : run_every_hours + last_update_id suffisent
ALTER TABLE collect_sources
  DROP COLUMN IF EXISTS run_every_days,
  DROP COLUMN IF EXISTS first_marker,
  DROP COLUMN IF EXISTS last_marker;

-- hash_contenu et status suffisent
ALTER TABLE documents
  DROP COLUMN IF EXISTS hash_source,
  DROP COLUMN IF EXISTS hash_texte_normalise,
  DROP COLUMN IF EXISTS current_step;

-- Reliquats : status / assigned_to / created_by suffisent
ALTER TABLE lots
  DROP COLUMN IF EXISTS source_id,
  DROP COLUMN IF EXISTS last_editor,
  DROP COLUMN IF EXISTS current_step,
  DROP COLUMN IF EXISTS last_sync_at;

-- Journal au niveau lot : document_id mort
ALTER TABLE journal_events DROP FOREIGN KEY IF EXISTS fk_journal_events_document_id;
ALTER TABLE journal_events DROP COLUMN IF EXISTS document_id;

-- Jobs au niveau lot : document_id mort
ALTER TABLE server_jobs DROP FOREIGN KEY IF EXISTS fk_server_jobs_document_id;
ALTER TABLE server_jobs DROP COLUMN IF EXISTS document_id;

-- Table abandonnée (seul user_favorites sert ; local_favorites vide)
DROP TABLE IF EXISTS local_favorites;
