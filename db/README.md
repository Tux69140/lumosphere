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

- **3.3** : tables auth (`users`, `roles`, `permissions`, `role_permissions`,
  `role_oeuvre_access`, `active_sessions`).
- **3.4** : tables modules (`import_sources`, `telegram_channels`, `mediatheque`,
  `bibliotheque`, `notifications`, `config`, `emojis`, `export_jobs`, `schema_version`,
  `user_favorites`, `local_favorites`). À ce moment, **ajouter la FK différée**
  `citations.import_source_id → import_sources(id)`.
- **3.7** : seeds des thèmes depuis `docs/themes-lumosphere.md` (**fichier à créer**).
