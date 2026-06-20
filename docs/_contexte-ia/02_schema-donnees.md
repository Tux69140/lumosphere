# 02 — Schéma de données

Base **MySQL/MariaDB unique** `mist2786_lumosphere`. MariaDB 11.4.12, `utf8mb4`, **InnoDB**. Quatre zones de tables. Schéma réel actuel (atelier) : `../_reference/schema_actuel_serveur-20260620.sql`.

## Conventions transverses
- Clé technique : `id INT UNSIGNED AUTO_INCREMENT`. **Mais** les tables atelier se lient par **`lot_id` VARCHAR(100)** (FK métier — ne pas changer, compat code/cron).
- Horodatage : `created_at`/`updated_at DATETIME … ON UPDATE CURRENT_TIMESTAMP` (pas de trigger updated_at).
- JSON : `longtext … CHECK (json_valid(...))` (MariaDB).
- Booléens : `TINYINT(1)`. Énumérations : `ENUM` (listes fermées).
- **Recherche corpus** : index `FULLTEXT` + collation **accent-insensible** (valider `utf8mb4_unicode_ci` ou `utf8mb4_unicode_520_ci` : « eveil » doit trouver « éveil »).
- Requêtes : **paramètres liés** ; verrous d'édition `SELECT … FOR UPDATE` ; pagination keyset.

## Zone ATELIER — existante (11 tables réelles, à conserver)
- **`lots`** : `id`, `lot_id` (unique), `source_type` enum(pdf/telegram/youtube/html), `status` (14 valeurs, défaut `importe_raw`), `assigned_to`, `current_step`, `server_lot_path`, `date_source_debut` (NOT NULL), `date_source_fin`. *Un lot = un responsable.*
- **`documents`** : `lot_id` (FK), `type_document` (**à nettoyer — D9** : enum contient aujourd'hui `telegram` ET `Telegram` + valeurs héritées → standardiser sur `Telegram` et purger), `status`, `current_step`, `hash_source`, `hash_texte_normalise`, `date_publication`.
- **`journal_events`** : journal officiel (lot_id, document_id, actor, action, old/new_status, message). → réduire à un suivi léger.
- **`collect_sources`** : sources auto-collectées. **`first_marker`** (plus ancien) + **`last_marker`** (dernier, DATE) = repères à **conserver** (reprise/rattrapage, lots jetables). `enabled` (défaut 0), `run_every_hours` (12).
- **`server_jobs`** : file de jobs (status queued/running/…, attempts, run_after, locked_by). Cœur du traitement long.
- **`telegram_updates_buffer`** : tampon des posts bot (à **purger** après agrégation).
- **`ia_settings`**, **`ia_model_registry`**, **`ia_model_catalog_cache`** : config + catalogue IA (à conserver).
- **`pivot_exports`** : **re-rôler** en traçabilité staging/validation (statuts → `brouillon`/`en_staging`/`valide`/`rejete` ; `imported_in_lumosphere_at` → « validé le »).
- **`sync_files`** : **abandonner** (plus de synchro locale en full-web).

## Zone CORPUS — à créer (source : Index v4 + triggers v2)
`auteurs` · `oeuvres` (FK→auteurs, `auteur_id` NOT NULL) · `themes` (auto-réf `parent_id`, `chemin` calculé en PHP, **≤ 2 niveaux**) · `etats` (seed C/R/P, `est_modifiable=0`) · `citations` (`oeuvre_id` NOT NULL, `theme_id` nullable, `etat_id` NOT NULL, `telegram_message_id`, provenance `import_source_id`/`source_item_id`/`source_item_date`, **`deleted_at`** soft-delete) · `keywords` (unicité insensible casse) · `citation_keywords` (PK composite CASCADE) · `mediatheque` · `bibliotheque` · `notifications` · `telegram_channels` (réconcilier avec `collect_sources`) · `import_sources` (**sans `import_runs`**) · `config` · `emojis` · `export_jobs` · `schema_version` · `user_favorites` · `local_favorites`.
- **Recherche** : `FULLTEXT(citations.contenu, notes)` + colonne dénormalisée `auteur_nom` (remplace FTS5 + triggers de SQLite).

## Zone STAGING — à concevoir
`import_staging_documents`, `import_staging_segments`, `import_staging_media`, `import_staging_events`. Dérivées du modèle pivot 3.4 : `document`(titre, auteurs[], type_document, langue ISO 639-1, resume_court) · `source`(type + attribution) · `segments`(ordre, type_segment, texte Markdown, hash_segment, timecodes) · `indexation`(themes, mots_cles, mots_cles_ia) · `media`. **Garde de validation** : Telegram exige thèmes + mots-clés validés avant passage à « validé ».

## Zone AUTH — à créer
`users` (email unique, bcrypt, role_id) · `roles` (seed : Administrateur **protégé**, Éditeur, Visiteur, Abo3, Abo4) · `permissions` · `role_permissions` · **`role_oeuvre_access`** (droits Abo3/Abo4 par œuvre) · `active_sessions`.
