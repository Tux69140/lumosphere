# 02 — Data schema

Single **MySQL/MariaDB** `mist2786_lumosphere`. MariaDB 11.4.12, `utf8mb4`, **InnoDB**. Three zones (atelier · corpus · auth — **no staging**). Real current schema (atelier): `../_reference/schema_actuel_serveur-20260620.sql`.

## Cross-cutting conventions
- Tech key: `id INT UNSIGNED AUTO_INCREMENT`. **But** atelier tables link via **`lot_id` VARCHAR(100)** (business FK — keep, code/cron compat).
- Timestamps: `created_at`/`updated_at DATETIME … ON UPDATE CURRENT_TIMESTAMP` (no updated_at trigger).
- JSON: `longtext … CHECK (json_valid(...))`. Booleans: `TINYINT(1)`. Enums: `ENUM`.
- **Corpus search**: `FULLTEXT` index + **accent-insensitive** collation (validate `utf8mb4_unicode_ci` or `_520_ci`: "eveil" must find "éveil").
- Queries: **bound params**; edit locks `SELECT … FOR UPDATE`; keyset pagination.

## ATELIER zone — existing (11 real tables, keep)
- **`lots`**: `id`, `lot_id` (unique), `source_type` enum(pdf/telegram/youtube/html), `status` (14 vals, default `importe_raw`), `assigned_to`, `current_step`, `server_lot_path`, `date_source_debut` (NOT NULL), `date_source_fin`. *One lot = one owner.*
- **`documents`**: `lot_id` (FK), `type_document` (**clean — D9**: enum mixes `telegram`/`Telegram` + legacy → standardize on `Telegram`, purge), `status`, `current_step`, `hash_source`, `hash_texte_normalise`, `date_publication`.
- **`journal_events`**: official log (lot_id, document_id, actor, action, old/new_status, message) → reduce to light tracking.
- **`collect_sources`**: auto-collected sources. **`first_marker`** (oldest) + **`last_marker`** (latest, DATE) = **keep** (resume/backfill, disposable lots). `enabled` (default 0), `run_every_hours` (12).
- **`server_jobs`**: job queue (status queued/running/…, attempts, run_after, locked_by). Core of long tasks.
- **`telegram_updates_buffer`**: bot-post buffer (**purge** after aggregation).
- **`ia_settings`**, **`ia_model_registry`**, **`ia_model_catalog_cache`**: AI config + catalog (keep).
- **`pivot_exports`**: **drop** (no pivot, no staging); integration traceability via `journal_events` + import provenance on `citations`.
- **`sync_files`**: **drop** (no local sync in full-web).

## CORPUS zone — to create (source: Index v4 + triggers v2)
`auteurs` · `oeuvres` (FK→auteurs, `auteur_id` NOT NULL) · `themes` (self-ref `parent_id`, `chemin` computed in PHP, **≤ 2 levels**) · `etats` (seed C/R/P, `est_modifiable=0`) · `citations` (`oeuvre_id` NOT NULL, `theme_id` nullable, `etat_id` NOT NULL, `telegram_message_id`, provenance `import_source_id`/`source_item_id`/`source_item_date`, **`deleted_at`** soft-delete) · `keywords` (case-insensitive unique) · `citation_keywords` (composite PK CASCADE) · `mediatheque` · `bibliotheque` · `notifications` · `telegram_channels` (reconcile w/ `collect_sources`) · `import_sources` (**no `import_runs`**) · `config` · `emojis` · `export_jobs` · `schema_version` · `user_favorites` · `local_favorites`.
- **Search**: `FULLTEXT(citations.contenu, notes)` + denormalized `auteur_nom` (replaces SQLite FTS5 + triggers).

## No STAGING zone (dropped)
A conform lot's validation writes **directly** to corpus, in a **transaction**, then the lot is deleted. The **prepared document** is built in atelier tables (`documents`/segments) per the ex-pivot 3.4 model — `document`(titre, auteurs[], type_document, langue ISO 639-1, resume_court) · `source`(type + attribution) · `segments`(ordre, type_segment, Markdown text, hash_segment, timecodes) · `indexation`(themes, mots_cles, mots_cles_ia) · `media` — then mapped to `citations`/`keywords`/`citation_keywords`/`mediatheque`. **Conformity gate** (before integration): full set theme+date+author+keywords, no duplicate (hash + `telegram_message_id`).

## AUTH zone — to create
`users` (email unique, bcrypt, role_id) · `roles` (seed: Administrateur **protected**, Éditeur, Visiteur, Abo3, Abo4) · `permissions` · `role_permissions` · **`role_oeuvre_access`** (Abo3/Abo4 per-work rights) · `active_sessions`.
