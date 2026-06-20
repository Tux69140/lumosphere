# STACK TECHNIQUE — Lumosphère

**Version 1.0 — 20 juin 2026**

Document technique de référence de l'application unique **Lumosphère** (atelier + bibliothèque). Remplace `pretraitement/docs/stack_technique-pretraitement.md` et `index-lulumineux/docs/architecture-index_lulumineux.md`. Toute décision contraire doit être validée explicitement.

---

## 1. Décisions fondatrices

| Sujet | Choix |
| --- | --- |
| Application | **Une seule app web** sur o2switch, **installable en PWA** (Windows/Linux/Mac/Android). |
| Front | **React + Vite**, servi en statique, même origine que l'API. |
| API | **PHP** simple, sans framework lourd, compatible o2switch mutualisé. |
| Base | **MySQL/MariaDB unique** = source de vérité (atelier + corpus + staging + auth). |
| Échange atelier→corpus | **Staging interne** + statut de validation (plus de fichier pivot). |
| Traitements longs | **File de jobs `server_jobs` + cron** (jamais dans la requête web). |
| IA | **LiteLLM** (cloud), providers configurables. |
| Auth | **Sessions PHP** (cookie `httpOnly`/`Secure` + CSRF). |
| Hors-ligne | **Aucun** dans cette phase (internet requis). |
| Portabilité native | **Couche d'abstraction UI/UX + services conservée** → Tauri possible plus tard sans réécrire l'UI. |
| Hébergement | o2switch mutualisé, **pas de VPS**. Site à la racine `/home2/mist2786/public_html/`. |

---

## 2. Architecture d'ensemble

```text
 Navigateur (PWA installable)                    o2switch
 React/Vite + couche d'abstraction   --HTTPS-->  API PHP (même origine)
        |                                            |
        | services applicatifs (contrats stables)    | PDO
        v                                            v
   (adaptateur Web aujourd'hui ;                MySQL/MariaDB unique
    adaptateur Tauri possible demain)           [ atelier | staging | corpus | auth ]
                                                     |
                                            file server_jobs + cron
                                                     |
                                            workers Python (venv py311) : Telegram, PDF…
```

- **Isolation** : l'interface React n'appelle jamais le runtime directement ; elle passe par des **services applicatifs** (contrat `EpurielServices`). Aujourd'hui un seul adaptateur (Web/`fetch`) ; demain un adaptateur Tauri visant le même contrat.
- **Une base, plusieurs zones de tables** : atelier (mécanique de préparation), staging (sas de validation), corpus (vérité éditoriale), auth (utilisateurs/rôles/droits).

---

## 3. Front — React / Vite / PWA

- React 19 + Vite, TypeScript, Tailwind (charte orange/violet/gris, clair-sombre).
- **PWA** : `manifest.json` + service worker minimal (installabilité + emballage magasins ; **pas de cache hors-ligne du corpus**). Emballage Microsoft Store (MSIX) et Google Play (TWA + `assetlinks.json`) via **PWABuilder**.
- **Responsive** desktop/tablette/mobile (l'UI actuelle « bureau d'abord » est à adapter).
- **Abstraction** : `abstraction/uiContract.ts` + `services/` (contrat `EpurielServices` : settings, lots, lotFiles, checkpoint, telegram, ia, pivot→staging, localStorage, nativeBridge). UI/UX **sans dépendance runtime**. Persistance des réglages via `localStorage`.
- Pas d'Electron (retiré). Les fonctions internes gardent leur nommage `epuriel_*` (« Epuriel » = nom interne de l'atelier).

---

## 4. API PHP

- Routeur unique (`epuriel.php`, conservé en interne) + socle `bootstrap.php` (CORS, config, PDO, helpers).
- Configuration sensible **hors dépôt** et hors zone web : `/home2/mist2786/…/config/config.php` (db_*, lots_root, python_bin, timezone, clés IA). Jamais d'URL/identifiant en dur.
- **Authentification par session** (remplace le jeton `X-Epuriel-Token`) : `/auth/login`, `/auth/logout`, `session_start`, cookie `httpOnly`/`Secure`/`SameSite`, CSRF. Tous les endpoints passent par une vérification de session.
- Requêtes **PDO en paramètres liés** uniquement (aucune concaténation SQL).

---

## 5. Base de données MySQL/MariaDB

MariaDB 11.4.12, `utf8mb4`, **InnoDB**. **Collation accent-insensible** (`utf8mb4_0900_ai_ci` ou `utf8mb4_unicode_520_ci`) pour une recherche sans accents. Base : `mist2786_lumosphere` ; utilisateur applicatif restreint **SELECT/INSERT/UPDATE/DELETE** (jamais ALTER/CREATE/DROP).

### 5.1 Zone atelier (existante — 11 tables réelles serveur)
`lots`, `documents`, `journal_events`, `collect_sources`, `pivot_exports`, `sync_files`, `server_jobs`, `telegram_updates_buffer`, `ia_settings`, `ia_model_registry`, `ia_model_catalog_cache`.
- Liaison inter-tables par **`lot_id` VARCHAR** (clé métier, pas l'`id`) — contrainte de compat code/cron.
- `config_json` en LONGTEXT + `JSON_VALID`. Statut par défaut `importe_raw`. Hashes SHA-256.
- **Évolutions** : `sync_files` **abandonnée** (plus de synchro locale) ; `pivot_exports` **re-rôlée** en traçabilité staging/validation ; `collect_sources.last_marker`/`first_marker` **conservés** (reprise/rattrapage des collectes — lots jetables).

### 5.2 Zone corpus (à créer — source : schéma Index v4 + triggers v2)
`auteurs`, `oeuvres`, `themes` (chemin matérialisé, ≤ 2 niveaux), `etats` (C/R/P), `citations` (soft-delete `deleted_at`, provenance d'import), `keywords`, `citation_keywords`, `mediatheque`, `bibliotheque`, `notifications`, `telegram_channels`, `import_sources` (sans `import_runs`), `config`, `emojis`, `export_jobs`, `schema_version`, `user_favorites`, `local_favorites`.
- **Recherche** : index `FULLTEXT` InnoDB sur `citations(contenu, notes)` + `auteur_nom` dénormalisé (remplace FTS5 + ses triggers).
- **Adaptation SQLite→MySQL** : AUTO_INCREMENT, types VARCHAR/TEXT/LONGTEXT, TINYINT(1), `ON UPDATE CURRENT_TIMESTAMP` (remplace triggers updated_at), ENUM/CHECK, `chemin` calculé en PHP.

### 5.3 Zone staging (à concevoir)
`import_staging_documents`, `import_staging_segments`, `import_staging_media`, `import_staging_events` — dérivées du modèle pivot 3.4 (`document`/`source`/`segments`/`indexation`/`media`). Garde de validation : pour Telegram, thèmes + mots-clés requis avant passage à « validé ».

### 5.4 Zone auth
`users` (bcrypt), `roles` (Administrateur protégé, Éditeur, Visiteur, Abo3, Abo4), `permissions`, `role_permissions`, `role_oeuvre_access` (droits par œuvre), `active_sessions`.

### 5.5 Règles métier (couche PHP)
État défaut `À Corriger` ; `Publiée` interdit sans thème ; états système non supprimables ; thèmes ≤ 2 niveaux ; mots-clés normalisés ; **suppression douce filtrée** ; **droits par œuvre appliqués à toutes les lectures** ; verrous d'édition via `SELECT … FOR UPDATE` ; pagination keyset.

---

## 6. Cycle de vie des lots (jetables)

Un lot = espace de travail **temporaire**. Après import réussi en staging/corpus, **tout le dossier du lot est effacé** (source brute + intermédiaires). **Mode débogage** (défaut OFF) conserve le dossier pour diagnostic. Seuls **`last_marker`/`first_marker`** par source auto-collectée (Telegram/YouTube/HTML, pas le PDF manuel) sont conservés en base. Journal réduit (créé/pris/validé/supprimé, erreurs), élagué. `telegram_updates_buffer` purgé après agrégation.

---

## 7. Traitements longs — file de jobs + cron

Tout traitement lourd (collecte Telegram, OCR/extraction PDF, transcription YouTube, enrichissement IA) passe par la table **`server_jobs`** dépilée par le cron **`run_jobs.php`**. Jamais d'`exec()` long dans une requête web. Pas de Celery/RQ/Redis (trop lourd pour le mutualisé). Workers **Python** lancés via `exec()` depuis PHP.

---

## 8. IA — LiteLLM (cloud)

Couche unique via LiteLLM (Ollama local **abandonné** — pas de processus persistant ni GPU sur o2switch). Providers configurables (openai/anthropic/mistral/deepseek/gemini/ollama_cloud), défaut `gemini`, **allowlist** des modèles, mémorisation serveur du couple provider+modèle, journalisation coût/latence. Clés en config serveur, jamais côté navigateur.

---

## 9. Capacités et contraintes o2switch

| Élément | État |
| --- | --- |
| PHP | 8.1.34 (web + cli) |
| Base | MariaDB 11.4.12 |
| `exec()` / cron | OK (binaire cron `/usr/local/bin/php`) |
| Python | **système 3.6.8 inutilisable → venv py311** |
| PyMuPDF / Pillow / LiteLLM | OK |
| Ghostscript | présent (`/usr/bin/gs`) |
| Tesseract / OCRmyPDF / Poppler | **ABSENTS** → chaîne PDF OCR contrainte (à valider/reporter) |
| Pandoc | **absent** → EPUB (phase 3) nécessite un binaire embarqué |
| VPS / GPU / processus persistant | non |

---

## 10. Déploiement

- Site à la **racine** `/home2/mist2786/public_html/` (build React + API PHP, même origine → CORS simple + cookies d'auth). Accès `ssh lumosphere`.
- Atelier (cron, workers, lots transitoires) sous `/home2/mist2786/…` ; le segment interne « epuriel » peut être conservé (nom de l'atelier) ou migré.
- Secrets dans `config/config.php` (hors dépôt). Base `mist2786_lumosphere`, utilisateur `mist2786_lumo_usr`.

---

## 11. Qualité et outillage

- `pnpm` (front) : Vitest, Playwright, ESLint, Prettier, TypeScript.
- Python : Ruff. PHP : PHPStan, PHPCS. Secrets : Gitleaks (étendu aux secrets d'auth).
- Avant tout commit : `lint` + `build` verts + vérification manuelle ciblée.

---

## 12. Référence

Schéma réel serveur (structure, sans données) et arborescence : `docs/_reference/` (instantané 2026-06-20). Devbook de migration et inventaires détaillés : `pretraitement/docs/devbook_migration_full_web-lumosphere.md`.
