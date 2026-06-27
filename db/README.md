# Base de données Lumosphère — migrations SQL

Scripts DDL de la base unifiée `mist2786_lumosphere` (MariaDB 11.4.12, o2switch, InnoDB).

## Comment exécuter

> ⚠️ La création/suppression de tables (`CREATE`/`ALTER`/`DROP`) se fait **via phpMyAdmin
> avec le compte cPanel**. L'utilisateur applicatif `mist2786_lumo_usr` n'a que
> `SELECT/INSERT/UPDATE/DELETE` (décision de sécurité, devbook Phase 2).

1. phpMyAdmin → base `mist2786_lumosphere` → onglet **SQL** (ou **Importer** le fichier).
2. Coller/importer le script, exécuter.
3. Lancer ensuite le script de vérification correspondant.

## Migrations

| Fichier | Phase | Contenu |
| --- | --- | --- |
| `migrations/003_corpus_fulltext.sql` | 3.1 + 3.2 | 7 tables corpus (`auteurs`, `oeuvres`, `themes`, `etats`, `citations`, `keywords`, `citation_keywords`) + index `FULLTEXT` sur `citations` |
| `verify/003_verify.sql` | — | Contrôles : tables présentes, seed états, FULLTEXT, accent-insensibilité, GRANT app |
| `rollback/003_corpus_fulltext_rollback.sql` | — | ⚠️ **DESTRUCTIF** — annule la 003 (`DROP TABLE`). Rangé à part pour éviter de l'exécuter par erreur. Ne jamais lancer sur des tables peuplées. |
| `migrations/004_auth.sql` | 3.3 | 6 tables auth (`roles`, `permissions`, `role_permissions`, `users`, `role_oeuvre_access`, `active_sessions`) + données initiales rôles/permissions |
| `verify/004_verify.sql` | — | Contrôles : tables présentes, données initiales, associations rôle↔permission, intégrité FK, CASCADE, droits app |
| `rollback/004_auth_rollback.sql` | — | ⚠️ **DESTRUCTIF** — annule la 004 (`DROP TABLE`). |
| `migrations/005_modules.sql` | 3.4 + 3.5 | 9 tables modules + ALTER `collect_sources` (oeuvre_id, ENUM étendu) + FK `citations→collect_sources` + DROP `pivot_exports`/`sync_files` |
| `verify/005_verify.sql` | — | Contrôles : tables, ALTER, FK, CASCADE, seed schema_version, tables legacy supprimées |
| `rollback/005_modules_rollback.sql` | — | ⚠️ **DESTRUCTIF** — annule la 005 (ne recrée pas pivot_exports/sync_files) |
| `migrations/006_themes_seed.sql` | 3.7 | Seed référentiel : 4 thèmes racine + 12 sous-thèmes (16 entrées, idempotent `INSERT IGNORE`). Source : `docs/themes-lumosphere.md` |
| `verify/006_verify_themes.sql` | — | Contrôles counts (16/4/12), chemins formés, profondeur ≤ 2, spots thème 1 et sous-thème 6 |
| `rollback/006_themes_rollback.sql` | — | ⚠️ **DESTRUCTIF** — purge `themes` (met `theme_id = NULL` dans `citations` via ON DELETE SET NULL) |
| `migrations/007_config_seed.sql` | 3bis | Réglages : `mode_debug_global='0'` (OFF), `journal_retention_days='90'`. Idempotent. |
| `verify/007_verify_config.sql` | — | Contrôle présence + valeurs des deux réglages |
| `rollback/007_config_rollback.sql` | — | Retire les deux réglages + la ligne schema_version 7 |

> 🛑 **Dossier `rollback/`** : scripts destructifs uniquement. Ne rien y exécuter sans intention explicite — un `DROP` supprime tables **et** données.

## Conventions appliquées (adaptation SQLite → MySQL, devbook Annexe C)

- `id` : `INT UNSIGNED AUTO_INCREMENT`.
- Horodatage : `created_at` / `updated_at` en `DATETIME`, `updated_at` avec
  `ON UPDATE CURRENT_TIMESTAMP` (remplace les triggers SQLite).
- Charset `utf8mb4`, collation **accent-insensible** `utf8mb4_unicode_520_ci`
  (recherche « eveil » → trouve « éveil »). Si indisponible sur le serveur,
  repli `utf8mb4_unicode_ci`.
- Recherche plein texte : index `FULLTEXT` InnoDB (pas de FTS5, pas de triggers FTS).
- `themes.chemin` (chemin matérialisé) et la profondeur **≤ 2 niveaux** sont calculés/validés
  **en PHP à l'écriture**, pas en SQL.

## Reste à faire dans les phases suivantes (rappel)

- ~~**3.3**~~ : ✓ tables auth — migration 004.
- ~~**3.4 + 3.5**~~ : ✓ tables modules + nettoyage — migration 005. `import_sources` et `telegram_channels` abandonnées au profit de `collect_sources` (décision chef de projet 2026-06-22). FK `citations.import_source_id → collect_sources(id)`.
- ~~**3.7**~~ : ✓ seed thèmes — `006_themes_seed.sql`. `docs/themes-lumosphere.md` créé.
