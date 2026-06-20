# Devbook de migration — Regroupement Epuriel + Index Lulumineux en une application full-web unique (Lumosphère)

> Document de cadrage et de pilotage. **Version 1.1 — 20 juin 2026** (Phase 0 verrouillée avec le chef de projet).
> But : lister **toutes les tâches et opérations** pour fusionner le pipeline `pretraitement` (Epuriel) et l'`index-lulumineux` (Lumosphère) en **une seule application web**, hébergée sur o2switch, **installable en PWA** (Windows/Linux/Mac/Android), accessible partout via navigateur.
> Ce devbook ne reproduit pas le code source : il énumère décisions, rédactions documentaires et opérations techniques, dans l'ordre, en citant les fichiers concernés.
> Légende : `- [x]` = réalisé/acté · `- [ ]` = à faire.

---

## 0. Lecture rapide pour le chef de projet

- **Cible** : une application web unique sur o2switch faisant l'**atelier de préparation** (ex-Epuriel) **et** la **bibliothèque éditoriale validée** (ex-Index Lulumineux), **installable en PWA** sur Windows/Linux/Mac/Android.
- **Stack** : React/Vite (existant Epuriel) + API PHP + **une base MySQL/MariaDB** = source de vérité. **Electron retiré** ; couche d'abstraction conservée pour un éventuel Tauri/natif plus tard.
- **En ligne** : pas de mode hors-ligne dans cette phase (accès internet requis). L'édition mobile pour 2-3 éditeurs sera un outil tiers séparé, futur, hors périmètre.
- **Le format pivot fichier disparaît** : remplacé par une **zone de staging interne** (tables MySQL) + un statut de validation. On est en dev sans données de production : casser le pipeline pendant la transition est acceptable.
- **Lots jetables** : un lot est un espace de travail temporaire, effacé après import en base (sauf mode débogage). Seuls les repères de collecte (dernier / plus ancien document par source) sont conservés en base.
- **Nouveau dépôt `lumosphere`** : on y importe le code utile, on archive les deux anciens dépôts. **Renommage technique réduit** : on garde les `epuriel_*` internes (« Epuriel » = nom interne de l'atelier).
- **Constat technique clé** : l'app Epuriel est **déjà** un client web (tout passe par l'API PHP en `fetch` ; le chemin « navigateur » couvre déjà les 8 services). La migration full-web est donc facile ; le vrai chantier = **authentification serveur** + **conception du schéma corpus/staging**.
- **Bénéfice inattendu** : le bug « failed to fetch » de l'autrice (Portugal) vient des **uploads multipart** du checkpoint. En full-web, la sauvegarde devient un petit POST de texte → la cause racine (MTU) disparaît probablement.

---

## Phase 0 — Décisions de cadrage ✅ VERROUILLÉES (20 juin 2026)

Toutes les décisions de cadrage ont été prises avec le chef de projet. Elles sont fermées.

- [x] **D1 — Stack.** Bâtir l'app unifiée sur **Epuriel : React/Vite + PHP + MySQL** (codé, fonctionnel). Plan SvelteKit/Node/SQLite de l'Index **abandonné** ; ses *spécifications* et son *schéma de données* restent la référence (code Index quasi vide — rien à porter).
- [x] **D2 — Une base MySQL = source de vérité.**
- [x] **D3 — Abandon du pivot fichier** → tables de staging internes + statut de validation.
- [x] **D4 — Nom.** Application = **Lumosphère** (côté utilisateur) ; **« Epuriel » = nom interne de l'atelier**. → Renommage technique **réduit** : on conserve les ~130 fonctions `epuriel_*` et le nommage interne de l'atelier.
- [x] **Portabilité — PWA installable, en ligne.** Couvre Windows/Linux/Mac/Android avec un seul code, soumettable Microsoft Store + Google Play via **PWABuilder**. **Electron retiré.**
- [x] **Abstraction — couche UI/UX + services conservée.** Assurance portabilité : permet Tauri / app native plus tard (dont magasin Apple) sans réécrire l'interface (coût de maintien quasi nul).
- [x] **Hors-ligne — aucun dans la phase full-web : accès internet requis.** Pas de cache offline du corpus. Édition mobile pour 2-3 éditeurs = outil tiers séparé futur, **hors périmètre**.
- [x] **D5 — Lots jetables.** Un lot est un espace de travail temporaire, effacé après import en base (sauf mode débogage). Repères de collecte conservés. Voir **Phase 3bis**.
- [x] **D6 — Portée du renommage réduite** (cf. D4) : Epuriel interne conservé ; côté utilisateur = Lumosphère. Voir Phase 5 révisée.
- [x] **D7 — Dépôt neuf `lumosphere`.** Importer le code utile des deux dépôts ; **archiver** `pretraitement` et `index-lulumineux` (après récupération des artefacts).
- [x] **D8 — Comptes o2switch.** Tout sur **`mist2786`** (`/home2/mist2786`, `lumosphere.org`) ; éliminer les traces de l'ancien compte **`sc1phcv1381`** (archive Bloc B).
- [x] **D9 — Telegram.** Standardiser `Telegram` partout, corriger les anciennes lignes, **supprimer le code de lecture mixte** `telegram`/`Telegram`.
- [x] **D10 — Pas de `import_runs`.** Suivi d'import simplifié (repères « dernier / plus ancien » dans `collect_sources`).
- [x] **D11 — Authentification.** Sessions PHP (cookie `httpOnly`/`Secure` + CSRF).
- [x] **Tables `import_staging_*`** : conçues par l'IA à partir du modèle pivot 3.4 (décision de méthode actée ; conception détaillée à faire en Phase 3.5).

---

## Phase 1 — Documentation de référence (rédaction & validation)

La documentation est refondue **avant** le code : elle cadre l'IA qui développera. Chaque document est rédigé puis validé.

> ⚠️ **Brouillons NON validés** — les items cochés `[x]` ci-dessous sont *produits*, pas encore *validés* par le chef de projet. Points à valider : `points_a_valider-phase1.md`.

> **Principe de fusion documentaire.** Partir des documents **Lumosphère** comme socle produit (bibliothèque) et y **réintégrer les fonctions d'atelier Epuriel** que le cahier des charges délègue aujourd'hui à un « pipeline annexe séparé » (`cahier_des_charges-index_lulumineux.md` §12, §17.4). Ce qui était « 2 projets reliés par pivot » devient « 2 zones internes reliées par staging ».

- [x] **1.0 — Créer le dépôt neuf `lumosphere`** (cf. D7) — *fait : dépôt + docs poussés sur GitHub ; reste : importer le code applicatif (Phase 2+)*. Et y importer le code utile (app React, API PHP, workers, docs fusionnées). Les anciens dépôts `pretraitement` et `index-lulumineux` seront archivés en fin de migration (Phase 9).

### Documents-socles à fusionner (entrées primaires)
- [x] **1.1 — Cahier des charges unifié.** Base = `index-lulumineux/docs/cahier_des_charges-index_lulumineux.md` (v5.1, quasi intégralement repris : 5 rôles, structure d'entrée, états C/R/P, organisation contenu, interface publique, recherche, éditeur, admin, médiathèque/bibliothèque/notifications, Telegram bot, IA, droits par œuvre, sauvegardes, exports, charte, accessibilité, phases). **Étendre** pour absorber les fonctions d'atelier Epuriel absentes : ingestion **multi-sources** (PDF, YouTube, HTML + Telegram), **lots** + dossiers numérotés, **journal**, **checkpoint**, **OCR/nettoyage/extraction**, **collecteurs cron**, **registre des modèles IA**. Réécrire le chapitre 12 (« import de documents préparés ») en **flux interne atelier → staging → corpus**.
- [ ] **1.2 — Document de spécification produit unifié.** Base = `index-lulumineux/docs/document_specifications-index_lulumineux.md` (PRD v3.0 : vision, 5 profils, objectifs — fiabilité avant rapidité, vie privée, 50 000 entrées). Y intégrer la vision « atelier + bibliothèque dans une seule application ».
- [ ] **1.3 — Réconciliation des contradictions** (à trancher document par document) :
  - **SQLite → MySQL** (le cahier, la spec et l'architecture supposent SQLite partout : règles PRAGMA §9, better-sqlite3, WAL). MySQL = vérité ; SQLite = export local.
  - **Svelte/Node → React/PHP** (la stack Index §5 est rejetée ; LiteLLM, Zod, TanStack Table restent valables côté React/PHP).
  - **Pivot fichier → staging interne** (le `Format_pivot.md` devient le schéma des tables de staging ; `pivot_version` devient un contrôle de schéma interne).
  - **« 2 projets séparés » / « ne jamais écrire dans les tables finales » → frontière de staging interne** (l'atelier écrit en staging ; la promotion staging → corpus exige une validation humaine d'Éditeur).
  - **Cible locale Electron/Tauri (Index) → PWA installable, en ligne** (pas d'app Electron ni de consultation hors-ligne dans cette phase ; couche d'abstraction conservée pour un Tauri éventuel).

### Documents techniques et de cadrage à réécrire
- [x] **1.4 — Stack technique unifiée** `docs/stack_technique-lumosphere.md` remplaçant `docs/stack_technique-pretraitement.md` et `index-lulumineux/docs/architecture-index_lulumineux.md`. Figer : React/Vite + PHP + MySQL, full-web o2switch, file de jobs + cron (pas de Celery/RQ/Redis — trop lourd pour le mutualisé), abstraction conservée pour le futur local, export SQLite, recherche FULLTEXT MySQL + collation accent-insensible, authentification serveur. **Préserver** les décisions o2switch : pas de VPS, `exec()` + cron, `server_jobs`, contraintes capacités serveur.
- [ ] **1.5 — README unique.** Décrire un seul produit. **Corriger** : (a) l'incohérence de chemin config `README.md:143` (`/home/sc1phcv1381/...`) vs `bootstrap.php:5` (`/home2/mist2786/...`) ; (b) les **noms d'outils erronés** (`extracteur_bot_telegram`, `extracteur_fichiers_telegram_bot` cités dans le README **n'existent pas** ; les vrais dossiers sont `telechargeur_msg_telegram/` et `telechargeur_fichiers_telegram/`) ; (c) le bloc « Format pivot » et `POST /lots/{id}/pivot` → staging.
- [ ] **1.6 — CLAUDE.md + AGENTS.md.** Périmètre unifié ; interdictions révisées : « ne plus produire de fichier pivot », « authentification serveur obligatoire », « plus d'écriture directe dans le corpus sans validation » (remplace « ne jamais écrire dans les tables finales de Lumosphère »), conserver « pdfmd jamais app principale ». Transposer les `.cursor/rules/*.mdc` de l'Index (security, database, dal) en règles du CLAUDE.md fusionné. Mettre à jour les chemins de déploiement (`epuriel`→`lumosphere`).
- [ ] **1.7 — Devbook de développement** suivant les **phases du cahier** (chap. 26 : Phase 1 cœur éditorial web / Phase 2 modules + local / Phase 3 exports), augmentées des modules d'atelier.
- [ ] **1.8 — format_pivot.md → modèle de données de staging.** Convertir en description des **tables `import_staging_*`**. Réconcilier les versions (Epuriel 3.4 fait foi ; Index 3.1 périmé) et **réintégrer le bloc `media`** (présent dans l'architecture/CDC, absent du pivot 3.1). Résoudre l'incohérence interne `date_debut/date_fin` vs `date_source_debut/date_source_fin`. Porter les enums (`type_document`, `type_segment`, `source.type`) en contraintes base. Porter la règle Telegram (themes + mots_cles validés requis) comme garde de passage à « validé ».
- [ ] **1.9 — Trame de travail unifiée** `docs/trame_travail-lumosphere.md` fusionnant `docs/trame_travail-pretraitement.md` et `index-lulumineux/docs/trame_travail-index_lulumineux.md`.
- [ ] **1.10 — Document IA directeur.** Récupérer `docs/archive/E.5 — IaProvider, LiteLLM et Ollama.md` comme référence IA : LiteLLM gateway unique, **cloud only (Ollama local abandonné)**, providers configurables (openai/anthropic/mistral/deepseek/gemini/ollama_cloud), défaut `gemini`, allowlist des modèles, mémorisation serveur du couple provider+modèle, journalisation coût/latence. Récupérer aussi `tableau_modeles_ia_a_valider.md` (règle d'allowlist).
- [ ] **1.11 — Conventions de traitement à récupérer de l'archive** : `info - Formatage_md_pour_rag.md` (chunking, front-matter, anti-résumé) ; logique YouTube (`Youtube*.md` : yt-dlp + youtube-transcript-api, 2 passes Map/Clean, garde-fou anti-résumé >20 %, timecodes) **en abandonnant** le SDK Google natif (→ LiteLLM) et Celery/RQ/Redis/S3 (→ file de jobs + cron).
- [ ] **1.12 — Récupération d'artefacts depuis `index-lulumineux` avant archivage** (cf. D7) : `db/schema_T0.2_v4_sources_simple.dbml` + `db/schema_T0.2_v2.sql` (triggers/seeds), `triggers-fts5.txt`, `docs/Charte_couleurs_UI.docx` + CDC §24 (orange / violet-mauve / gris, clair-sombre), `docs/Lumosphere-accueil.excalidraw` (maquette accueil).
- [ ] **1.13 — pdfmd : clarifier le hors-périmètre.** Les docs `apps/pdfmd/docs/*` visent l'intégration dans **« mktplus »** (éditeur tiers Muya), **hors cible Lumosphère**. Ajouter un encart « cible mktplus = hors périmètre » ; décider archivage de cette piste vs récupération différée des briques OCR. **Ne pas** inclure pdfmd dans la vague de renommage.

---

## Phase 1bis — Pack de contexte pour l'IA codeuse (optimisation des tokens)

Objectif : éviter de faire ingérer ~70 fichiers (dont l'archive redondante et contradictoire) à l'IA qui codera, et **économiser les tokens**. Se place **après** la fusion documentaire (Phase 1, dont elle est le condensé) et **avant** le codage.

- [x] **1bis.1 — Produire un dossier `docs/_contexte-ia/`** : 3 à 5 documents de référence **courts, dédupliqués, sans contradictions, faisant autorité**, par exemple :
  - `00_contexte-produit.md` — vision, périmètre, **décisions Phase 0 verrouillées** (1 page).
  - `01_architecture.md` — stack React/Vite + PHP + MySQL, full-web/PWA, abstraction, file de jobs + cron, contraintes o2switch (capacités, venv Python, OCR absent).
  - `02_schema-donnees.md` — schéma cible unifié (atelier + corpus + staging + auth), conventions (FK par `lot_id`, collation accent-insensible, FULLTEXT), repères de collecte, cycle de vie jetable des lots.
  - `03_conventions-et-regles.md` — règles métier (états, droits par œuvre, suppression douce…), conventions de code, interdits.
  - `04_flux-et-api.md` — routes API, flux atelier → staging → corpus, auth session.
- [x] **1bis.2 — Principes** : autorité unique (un seul endroit par sujet), **exclusion de l'archive** du contexte de codage, liens vers les docs détaillées seulement si nécessaire. C'est ce pack que l'IA codeuse lit en priorité.

---

## Phase 2 — Base MySQL : renommage et unification des comptes

**Faits techniques :** MySQL **ne renomme pas une base en place** ; cPanel/o2switch n'a pas de bouton « renommer ». Voie fiable : sauvegarde → création nouvelle base → import → bascule config → nettoyage. **Préfixe de compte imposé** → le nom réel est `mist2786_lumosphere`. **Bonne nouvelle code** : `bootstrap.php` lit `db_name` depuis `config.php` (`epuriel_pdo`, `bootstrap.php:83-95`) → la **connexion** ne change pas ; seuls la migration des données et les **références littérales** changent.

### 2.1 — Sauvegarde et préparation
- [ ] Sauvegarde complète (SSH lumosphere ouverte) : `mysqldump --defaults-extra-file=/home2/mist2786/.my.cnf mist2786_epuriel > ~/backup_epuriel_AAAAMMJJ.sql`. Vérifier taille/intégrité.

### 2.2 — Création de la nouvelle base
- [ ] Créer `mist2786_lumosphere` via cPanel (préfixe auto `mist2786_`).
- [ ] Créer l'utilisateur applicatif `mist2786_lumo_usr` (cohérence), **droits restreints SELECT/INSERT/UPDATE/DELETE uniquement** (jamais ALTER/CREATE/DROP — décision actée Bloc B / trame §858).
- [ ] Affecter l'utilisateur à la base.

### 2.3 — Transfert des données (préserver le schéma acté)
- [ ] Importer le dump : `mysql ... mist2786_lumosphere < ~/backup_epuriel_AAAAMMJJ.sql`. Vérifier nombre de tables/lignes.
- [ ] **Préserver intégralement le schéma de `mysql_schema_final_epuriel.sql`** : 7 tables (`lots`, `documents`, `journal_events`, `pivot_exports`, `collect_sources`, `sync_files`, `server_jobs`), MariaDB 11.4.12, utf8mb4/InnoDB, **FK par `lot_id` VARCHAR** (pas par `id` — contrainte de compat code/cron), `config_json` LONGTEXT + `JSON_VALID`, statut défaut `importe_raw`, ENUM de statuts (liste fermée), `date_source_debut` obligatoire pour tous, `run_every_hours`/`first_marker`/`enabled=non` sur `collect_sources`, hashes SHA-256, index actés.
- [ ] **Corriger** le `SET time_zone='+02:00'` codé en dur (heure d'été figée, archive Bloc B) → `Europe/Paris` dynamique.

### 2.4 — Bascule de la configuration
- [ ] Éditer `/home2/mist2786/epuriel/config/config.php` (hors Git) : `db_name`→`mist2786_lumosphere`, `db_user`/`db_pass`. Test de connexion (runbook `bloc-e-telegram.runbook.md:46`).

### 2.5 — Références littérales à renommer (voir Annexe A pour l'inventaire complet)
- [ ] Nom de base `mist2786_epuriel` et **ancien `sc1phcv1381_epuriel`** : runbook, `mysql_schema_decisions_epuriel.md`, archives Bloc B, scripts.
- [ ] Utilisateur `mist2786_epur_usr` / **ancien `sc1phcv1381_epuriel_usr`** → `mist2786_lumo_usr` + GRANTs.
- [ ] `grep -rn "mist2786_epuriel\|mist2786_epur_usr\|sc1phcv1381"` jusqu'à zéro résidu (hors archives volontairement conservées).

### 2.6 — Validation et nettoyage
- [ ] Faire tourner API + crons sur la nouvelle base en test. **Puis seulement** supprimer l'ancienne base et l'ancien utilisateur.

---

## Phase 3 — Schéma unifié : corpus + staging + auth (chantier base de données)

C'est ici qu'on fusionne réellement les données. La base atelier (7 tables) existe ; il faut **ajouter** la zone corpus, la zone staging et l'auth. Source : schémas `index-lulumineux/db/schema_T0.2_v4_sources_simple.dbml` (tables) + `schema_T0.2_v2.sql` (triggers/seeds concrets). **Adaptation SQLite → MySQL** détaillée en Annexe C.

### 3.1 — Tables corpus éditorial (à créer en MySQL)
- [ ] `auteurs`, `oeuvres` (FK→auteurs RESTRICT, `auteur_id NOT NULL`), `themes` (auto-référence `parent_id`, `chemin` matérialisé, **max 2 niveaux** appliqué en PHP), `etats` (seed C/R/P, `est_modifiable=0`), `citations` (`oeuvre_id NOT NULL`, `theme_id` nullable, `etat_id NOT NULL`, `telegram_message_id`, provenance `import_source_id`/`source_item_id`/`source_item_date`, **soft-delete `deleted_at`**, index composites), `keywords` (unicité insensible casse), `citation_keywords` (PK composite, CASCADE).

### 3.2 — Recherche plein texte
- [ ] Remplacer la table virtuelle FTS5 + ses 3 triggers par un **index `FULLTEXT` InnoDB** sur `citations(contenu, notes)` + colonne dénormalisée `auteur_nom` (maintenue à l'écriture). Base en collation **accent-insensible** (`utf8mb4_0900_ai_ci` MySQL 8 ou `utf8mb4_unicode_520_ci` MariaDB) pour l'équivalent de `remove_diacritics`. (Détails Annexe C.)

### 3.3 — Tables authentification / autorisation (brique nouvelle)
- [ ] `users` (email unique, `password_hash` bcrypt, `role_id`), `roles` (seed : Administrateur **protégé**, Éditeur, Visiteur, Abo3, Abo4), `permissions`, `role_permissions`, **`role_oeuvre_access`** (droits Abo3/Abo4 par œuvre), `active_sessions`. + mécanique session/CSRF PHP (Phase 6.2).

### 3.4 — Tables modules
- [ ] `mediatheque`, `bibliotheque`, `notifications`, `telegram_channels` (**à réconcilier** avec le bloc Telegram déjà codé côté atelier — `collect_sources`), `import_sources` (carnet de sources générique ; **pas de `import_runs`** — D10), `config`, `emojis`, `export_jobs` (phase 3), `schema_version`, `user_favorites`, `local_favorites`.

### 3.5 — Tables de staging (À CONCEVOIR — n'existent nulle part)
- [ ] Concevoir `import_staging_documents`, `import_staging_segments`, `import_staging_media`, `import_staging_events` — **nommées dans l'architecture §8.1 mais jamais définies**. Structure dérivée du modèle pivot 3.4 (`document`/`source`/`segments`/`indexation` + `media`) et de `Format_pivot_v2.md` (champs typés : `id_document`, `auteurs[]`, `langue` ISO 639-1, `segments[]` avec `ordre`/`type_segment`/`texte` Markdown/`hash_segment`/timecodes, état, 3 hashes de dédup).
- [ ] **Re-rôler** `pivot_exports` : de « traçabilité d'export fichier » (`genere`/`importe_lumosphere`/`erreur`) vers « traçabilité de passage en staging et validation » (statuts type `brouillon`/`en_staging`/`valide`/`rejete`) ; conserver `imported_in_lumosphere_at` re-sémantisé en « validé le ».
- [ ] **Abandonner `sync_files`** (cf. D5 / Phase 3bis) : caduque en full-web (plus de synchro fichiers locaux ↔ serveur).

### 3.6 — Règles métier à porter dans la couche PHP (architecture Index §10)
- [ ] État défaut citation = `À Corriger` ; `Publiée` interdit sans thème ; états C/R/P non supprimables ; Administrateur non supprimable/non réductible ; thèmes ≤ 2 niveaux ; mots-clés normalisés (unicité insensible casse) ; **suppression douce `deleted_at`** filtrée systématiquement ; **droits par œuvre appliqués à TOUTES les lectures** (pas un masquage UI) ; validation avant écriture (Zod React + validation PHP) ; pagination keyset (pas OFFSET) ; verrous d'édition concurrente via `SELECT … FOR UPDATE` (remplace le mécanisme PostgreSQL suggéré dans l'archive — **MySQL retenu**).

### 3.7 — Seeds
- [ ] Charger le référentiel **thèmes/sous-thèmes** depuis `docs/themes-lumosphere.md` (4 thèmes + sous-thèmes + descriptions) dans `themes` ; relier l'indexation des segments à ce référentiel (FK/validation au lieu de chaînes libres). Fin de `refs/lumosphere_referentiel.json` (le référentiel devient lecture interne directe en base).

---

## Phase 3bis — Cycle de vie des lots simplifié (lots jetables)

Décision du chef de projet : **ne conserver aucune trace des étapes**, sauf en mode débogage. Un lot devient un espace de travail temporaire.

- [ ] Après import réussi en staging/corpus, **effacer tout le dossier du lot** : `0_raw/` (source brute incluse), dossiers d'étapes intermédiaires, `*_exports/`, `manifest.json`, `journal.csv`.
- [ ] **Mode débogage** (réglage global + override par lot, **défaut désactivé**) : conserve l'intégralité du dossier du lot (brut + intermédiaires) pour le dev/diagnostic.
- [ ] **Persister en base, par source auto-collectée** (Telegram, YouTube, HTML — pas le PDF manuel) : `collect_sources.last_marker` (date du dernier document collecté → reprise) et `first_marker` (date du plus ancien → rattrapage historique). **Déjà présents** au schéma.
- [ ] Supprimer la production de `manifest.json` + `journal.csv` par lot (la base est la vérité) et des dossiers `*_exports/`.
- [ ] **Journal réduit** : suivi léger en base (créé / pris / validé / supprimé, erreurs) ; pas de trace par étape ; élagage des anciennes entrées.
- [ ] `telegram_updates_buffer` **purgé** systématiquement après agrégation en lot.
- [ ] Nettoyage **automatique** après import réussi (aujourd'hui surtout manuel via `epuriel_handle_lot_delete`) ; nettoyage volontaire conservé pour les résidus.
- [ ] Adapter `epuriel_ensure_lot_dirs` / `epuriel_source_dirs` (`bootstrap.php`) vers un dossier de travail minimal et transitoire.

---

## Phase 4 — Arborescence serveur, Python et capacités o2switch

### 4.1 — Arborescence et chemins
- [ ] **Chemin codé en dur** `bootstrap.php:5` (`EPURIEL_CONFIG_PATH`) + env `EPURIEL_CONFIG` (`:66`).
- [ ] **Entrée web publique** → racine de l'app unifiée sur `lumosphere.org` (même origine que le front → CORS simple + cookies d'auth). Sous **D4**, le **dossier atelier interne** `/home2/mist2786/epuriel/` (config, cron, workers, lots, reports, refs, venvs) **peut rester nommé `epuriel`** (nom interne de l'atelier) ou être migré vers `lumosphere/` — non bloquant.
- [ ] Chemins dérivés dans le code : `epuriel.php:1367,1424,1512,1823,2532,2876` (cron/workers, dont le segment littéral `/epuriel/` dans `dirname(__DIR__,3).'/epuriel/workers/process_telegram_v1.py'`).
- [ ] Crons cPanel (`collect_telegram_bot.php`, `agregateur_telegram_weekly.php`, `run_jobs.php`) + `reports/` : chemins `lumosphere`. Binaire cron `/usr/local/bin/php`.
- [ ] `config.php` : `python_bin`, `venv_path`, `lots_root`, `bin_ghostscript`.

### 4.2 — Python et capacités (récupérer les procédures d'archive)
- [ ] **Python système o2switch = 3.6.8 → inutilisable.** Utiliser le venv **py311** (`/home2/mist2786/epuriel/venvs/py311`, 3.11.15) → à déplacer/recréer sous `lumosphere/`. Procédure : `procedure_configurer_outils_serveur.md`.
- [ ] Capacités confirmées (`serveur.local.md`, `procedure_test_capacites_serveur.md`) : `exec()`/cron OK, PyMuPDF/Pillow/LiteLLM OK, **Ghostscript présent** (`/usr/bin/gs`), **Tesseract/OCRmyPDF/Poppler ABSENTS**, **Pandoc absent**. Conséquence : chaîne **PDF OCR contrainte** (à reporter / valider) ; **EPUB Pandoc** (phase 3) nécessite un binaire embarqué.
- [ ] Conserver le **modèle file de jobs + cron** (`server_jobs` + `run_jobs.php`) pour tout traitement long — ne jamais lancer le lourd dans la requête web (scénario « Cas C » de la procédure capacités).
- [ ] Réécrire le health-check schéma (ex-`verifier_bloc_b.php`, archive) pour le schéma complet et le nom `lumosphere`.

---

## Phase 5 — Renommage réduit (D4 : Lumosphère + Epuriel interne)

**Décision D4** : « Epuriel » reste le **nom interne de l'atelier**. On **ne renomme PAS** les ~130 fonctions `epuriel_*`, le routeur `epuriel.php`, ni les symboles/types internes — cela évite un renommage massif et risqué. On ne renomme que l'**identité visible** (app = Lumosphère) et ce qui est imposé par la cohérence compte/base.

- [x] **Conserver (ne pas toucher)** : fonctions `epuriel_*`, routeur `epuriel.php`, types/symboles internes (`EpurielServices`, etc.), nommage interne de l'atelier (y compris les dossiers serveur `epuriel/` comme « maison de l'atelier »).
- [ ] **5.1 — Identité utilisateur** : titre de l'app, logo, libellés visibles → **Lumosphère** (la section atelier peut afficher « Epuriel » comme nom de partie, cf. D4).
- [ ] **5.2 — Header HTTP** `X-Epuriel-Token` : **disparaît de toute façon** avec l'auth session (Phase 6.2) — rien à renommer, juste à retirer (`bootstrap.php:45,142`, `apiClient.ts:68`, `mockServices.ts:101`).
- [ ] **5.3 — Base / compte** : déjà traité (Phase 2 = `mist2786_lumosphere` ; Phase 4 = chemins). Le segment « epuriel » des chemins **atelier** peut rester (nom interne) ; seule l'**entrée web publique** doit refléter Lumosphère.
- [ ] **5.4 — Clé localStorage** `'epuriel.settings'` → `'lumosphere.settings'` (cosmétique, faible risque).
- [ ] **5.5 — Variables d'env / tests** : conserver `EPURIEL_*` en interne **ou** renommer `LUMOSPHERE_*` (optionnel). Mettre à jour les URL de test (`.env.test.api.*`, `vitest.api.config.ts`).
- [ ] **5.6 — Identité Electron** : **disparaît** avec le retrait d'Electron (Phase 6.4) — rien à renommer.

---

## Phase 6 — Bascule architecture full-web (chantier fonctionnel principal)

L'app est **déjà presque navigateur-ready** : tout le métier passe par `fetch` (`apiClient.ts`) ; le chemin navigateur (`mockServices.ts`) couvre les 8 services réels. Electron ne fait que persistance des réglages + runtime info.

### 6.1 — Promotion du web comme cible officielle
- [ ] Faire de `mockServices.ts` le service unique (le renommer `webServices`) ; simplifier `createServices.ts:5-17` pour ne retourner que les services navigateur.
- [ ] Construire le renderer en statique (`vite build`) et l'héberger sur o2switch, **même origine** que l'API PHP (`lumosphere.org`) → CORS d'origine unique + cookies d'auth simples.
- [ ] Conserver la persistance `localStorage('lumosphere.settings')`.

### 6.2 — Authentification serveur (POINT CRITIQUE — remplace le jeton client)
- [ ] Jeton actuel = secret partagé en clair côté client (`mockServices.ts:37,64,101`, env de build) — à supprimer.
- [ ] Créer `/auth/login` + `/auth/logout` (PHP), session (`session_start`, cookie `httpOnly`/`Secure`/`SameSite`), CSRF. Remplacer `epuriel_require_token` (`bootstrap.php:135-147`) par `lumosphere_require_session` ; adapter le CORS (`bootstrap.php:35-48`) pour `credentials`.
- [ ] Frontend : retirer le champ `apiToken` (settings + `uiContract` + SettingsView), `fetch(..., { credentials: 'include' })`, **écran de login**. Transformer l'écran « réglages jeton API » (`UI Epuriel.md` §1.1) en écran de connexion.
- [ ] Implémenter les **rôles** (Phase 3.3) et **mettre fin au « tout utilisateur admin » V1** (bloc-e-telegram.plan §21). Mot de passe admin initial à changer au premier démarrage.
- [ ] Étendre Gitleaks aux secrets d'auth/session.

### 6.3 — Abandon du fichier pivot → écriture en staging MySQL
- [ ] Réécrire `epuriel_handle_lot_pivot` (`epuriel.php:2307`) et `epuriel_register_generated_pivot_export` (`:2593`) : **INSÉRER dans les tables de staging** au lieu d'écrire `4_exports/*.pivot.json` + `pivot_exports`. Les deux origines actuelles (upload de fichier `.pivot.json` `:2315-2431` ; génération depuis révision `mode=generate_from_revision` `:2436`) convergent vers le staging.
- [ ] Adapter le worker `process_telegram_v1.py` (lancé `:2521` avec `--export-pivot`) : écrire en base, **ou** parser sa sortie JSON côté PHP et insérer en staging. **Nouvelle capacité** : les workers Python ne se connectent pas à MySQL aujourd'hui → ajouter PDO/MySQL au worker, ou conserver le parsing côté PHP.
- [ ] Conserver les validateurs (`epuriel_validate_minimal_pivot:3241`, `epuriel_validate_telegram_pivot:3269`) comme garde **avant insertion** ; porter la règle Telegram (thèmes + mots-clés validés requis avant passage à « validé »).
- [ ] Frontend : `exportTelegramPivot`/`generateTelegramPivotFromRevision` gardent la même route mais ne manipulent plus de fichier ; `pivotSummary.ts` affiche le contenu staging ; l'onglet « Erreurs et export pivot » (`UI Epuriel.md` §4.4) devient onglet « Staging / validation ».

### 6.4 — Retirer Electron, garder l'abstraction
- [ ] Supprimer `src/main/`, `src/preload/`, `services/electronServices.ts`, le type natif (`vite-env.d.ts`). Nettoyer `package.json` (retirer `electron`, `electron-vite`, scripts `dist:win:portable`), migrer `electron.vite.config` → config Vite pure.
- [ ] **Conserver la couche d'abstraction UI/UX + services** (le contrat `EpurielServices`, le découplage UI↔runtime) : c'est l'**assurance portabilité** qui permettra d'emballer l'app dans **Tauri** (vrai natif, magasin Apple) plus tard **sans réécrire l'interface**. Ne PAS la supprimer en retirant Electron.

### 6.5 — Repenser checkpoint / édition concurrente
- [ ] Le checkpoint actuel **uploade des fichiers** (`multipart`, `epuriel_handle_lot_checkpoint:2164`, `sync_files`) — c'est le modèle « app locale envoie ses fichiers » et **la cause du bug failed-to-fetch** (uploads volumineux/MTU, Portugal). En full-web, la sauvegarde = **petit POST de texte** édité directement sur le serveur sous session → repenser les boutons « Enregistrer » / « Mettre en pause et rendre disponible » en sauvegarde serveur + **verrou d'édition par session** (au lieu de `sync_files`).
- [ ] Conserver une stratégie de robustesse (chunking/MTU) pour les **uploads réellement volumineux restants** (import PDF source, médias).

### 6.6 — PWA (installable, en ligne)
- [ ] Ajouter `manifest.json`, **service worker minimal** (installabilité + emballage magasins ; **pas de cache hors-ligne du corpus** — phase en ligne), `vite-plugin-pwa`.
- [ ] **Responsive mobile** : l'UI actuelle est « bureau d'abord » (≈1200px) → adapter le viewport mobile/tablette (cf. cahier : utilisable desktop/tablette/mobile).
- [ ] **Emballage magasins via PWABuilder** : MSIX pour **Microsoft Store** ; TWA + `assetlinks.json` sur `lumosphere.org` pour **Google Play**. (App Store Apple non couvert ; Mac accessible hors-store.)

---

## Phase 7 — Application locale / export SQLite (RETIRÉE du périmètre V1)

La consultation hors-ligne et l'app locale Electron **ne sont plus au périmètre** : la PWA en ligne (Phase 6.6) couvre l'accès multi-plateforme installable. Conservé seulement comme piste future, non prioritaire :

- [ ] *(Différé, optionnel)* Export MySQL → SQLite read-only (FTS5 reconstruit) comme **artefact de sauvegarde/portabilité**.
- [ ] *(Hors périmètre)* Outil mobile d'**édition** pour 2-3 éditeurs = développement tiers séparé, parlant à la même API.

---

## Phase 8 — Outils Python et `apps/pdfmd`

- [ ] **8.1 — Workers Telegram serveur** (`serveur/epuriel/workers/collect_telegram_history.py`, `telegram_history_auth.py`) : **workers atelier officiels** (déjà intégrés, appelés par PHP via `exec()`, sortie JSON par stdout, session Telethon serveur). Rediriger leur sortie vers le **staging** (6.3). Renommer dossier `serveur/lumosphere/workers/`. (Ils n'ont aucun chemin/DB en dur — purement CLI.)
- [ ] **8.2 — `outils/telechargeur_msg_telegram/main-v3.py`** : **archiver** (doublon/ancêtre du worker serveur).
- [ ] **8.3 — `outils/telechargeur_fichiers_telegram/`** (téléchargeur de PDF Telegram, SQLite local autonome `telegram_downloads.db`) : **autonome, hors périmètre immédiat** ; candidat à devenir un worker d'ingestion PDF plus tard (remplacer son SQLite par la base unique, rediriger vers `0_raw`/staging).
- [ ] **8.4 — `outils/deduplicateur_pdf/dedup_md.py`** : **autonome, poste local** (dépend d'Ollama local, non portable o2switch). **Aligner README ↔ code** (le README décrit du PDF, le code travaille en Markdown via rapidfuzz + Ollama).
- [ ] **8.5 — `outils/diagnostic_post_epuriel/`** : teste le header `X-Epuriel-Token` (caduc avec l'auth session) → **archiver ou refondre** pour tester login/session.
- [ ] **8.6 — `apps/pdfmd/`** : **reste atelier/référence, jamais app principale** (CLAUDE.md). Cible documentée « mktplus » = hors périmètre Lumosphère. Récupération différée possible des briques OCR (`1.ocr_pdf.sh`, EasyOCR, `pdf_extractor.py`) comme futurs workers PDF, **sous réserve** de valider OCR sur o2switch (absent aujourd'hui). Ne pas renommer dans la vague `epuriel→lumosphere`.

---

## Phase 9 — Vérification, bascule et nettoyage

- [ ] **9.1** — `pnpm lint` + `pnpm build` verts (dossier app). Conserver le socle qualité (Vitest, Playwright, Ruff, PHPStan, PHPCS, Gitleaks).
- [ ] **9.2** — Tests des nouveaux endpoints : login/session, staging, validation. Conserver les tests destructifs préfixés (`TEST_E0B3_`), migrer URL/vars de test.
- [ ] **9.3** — Vérification manuelle ciblée : login, liste des lots, révision, passage en staging, validation vers corpus, recherche accent-insensible.
- [ ] **9.4** — Mettre à jour le runbook Telegram (`bloc-e-telegram.runbook.md`, `bloc-e-telegram-proof.sh`) : variables/chemins (`DB`, `BASE_DIR`, `BOOTSTRAP`, `EPURIEL_CONFIG`, crons, reports) ; remplacer les assertions « fichier pivot présent » par « entrée staging validée ».
- [ ] **9.5** — Suppression de l'ancienne base et de l'ancien dossier serveur (après période de test).
- [ ] **9.6** — Archivage des **deux anciens dépôts** `pretraitement` et `index-lulumineux` (le dépôt actif devient `lumosphere`, cf. 1.0 ; après récupération des artefacts 1.12).
- [ ] **9.7** — Mise à jour de la mémoire projet.

---

## Annexe A — Inventaire des références à renommer

| Élément | Emplacements |
| --- | --- |
| Base `mist2786_epuriel` (+ ancien `sc1phcv1381_epuriel`) | `docs/bloc-e-telegram.runbook.md` (var `DB`, l.33/162/294/309), `docs/mysql_schema_decisions_epuriel.md:5`, `docs/archive/mysql_intervention_ssh_epuriel.md`, `docs/archive/mysql_schema_final_epuriel.sql` (en-tête), Bloc B (ancien compte) |
| Utilisateur `mist2786_epur_usr` (+ `sc1phcv1381_epuriel_usr`) | `docs/archive/mysql_intervention_ssh_epuriel.md:47`, `docs/trame_travail-pretraitement.md:858`, archives Bloc B |
| Chemins `/home2/mist2786/epuriel/` | `README.md:97-117`, `CLAUDE.md:82-85`, `AGENTS.md:13-15`, `stack_technique-pretraitement.md:156-162,259-261`, `document_specification-pretraitement.md:502`, `trame_travail-pretraitement.md:151-178`, runbook (multiples), `serveur.local.md` |
| Config codée en dur | `.remote/lumosphere-api/bootstrap.php:5,66` |
| Connexion base (lit `db_name` — pas de modif code) | `bootstrap.php:83-95` (`epuriel_pdo`) |
| Chemins workers/cron dérivés | `epuriel.php:1367,1424,1512,1823,2532,2876` |
| Header `X-Epuriel-Token` | `bootstrap.php:45,142`, `apiClient.ts:68`, `electronServices.ts:67`, `mockServices.ts:101` |
| Fonctions `epuriel_*` (~130) + routeur | `.remote/lumosphere-api/bootstrap.php`, `epuriel.php` |
| Symboles/clés/vars frontend | `contracts.ts:1,7,395`, `uiContract.ts:94`, `createServices.ts:5`, `useEpurielAppController.ts:287`, `mockServices.ts:37`, `vite-env.d.ts:5,22`, `preload/index.ts:7,24,26`, `.env.test.api.*`, `vitest.api.config.ts` |
| Workers Python (docstrings) + dossier | `serveur/epuriel/workers/collect_telegram_history.py`, `telegram_history_auth.py` |
| Chemin config incohérent à corriger | `README.md:143` (`/home/sc1phcv1381/...`) vs `bootstrap.php:5` |
| Noms d'outils erronés dans le README | `README.md:330-355` (`extracteur_*` inexistants → `telechargeur_*`) |

## Annexe B — Inventaire des routes API et tables touchées (`epuriel.php`)

`/lots/create` (lots, journal_events) · `/lots/{id}/0_raw` (lots, documents, server_jobs, journal_events) · `/lots/{id}/take` (lots, journal_events) · `/lots/delete/preview` + `/lots/delete` (DELETE dynamique sur toutes tables à `lot_id`) · `/lots/{id}/checkpoint` (sync_files, documents, journal_events) · `/lots/{id}/pivot` (**pivot_exports → staging**, lots, documents, journal_events) · `/ia/settings` GET/POST · `/ia/models/refresh|registry/save|test` (ia_model_registry, ia_model_catalog_cache) · `/lots/{id}/ia/regenerate` (server_jobs, documents, journal_events) · `/lots/waiting` · `/telegram/sources` GET/POST (collect_sources) · `/telegram/lots/create-from-buffer` + `collect-and-create` (telegram_updates_buffer, lots, documents, server_jobs) · `/telegram/history/auth/start|confirm` (script Python) · `/lots/{id}/files` + `/files/read` · `/lots/{id}` (détail).
**Tables :** lots, documents, journal_events, server_jobs, sync_files, pivot_exports, collect_sources, telegram_updates_buffer, ia_model_registry, ia_model_catalog_cache, + réglages IA. **Config lue :** api_token, db_*, lots_root, python_bin, timezone, clés IA.

## Annexe C — Adaptation schéma SQLite → MySQL (zone corpus)

| SQLite (Index) | Cible MySQL/MariaDB |
| --- | --- |
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `TEXT` générique | `VARCHAR(n)` (clés/courts), `TEXT`/`MEDIUMTEXT` (contenu), `LONGTEXT` (Markdown long) |
| `updated_at` via trigger | `DATETIME … ON UPDATE CURRENT_TIMESTAMP` (supprime les triggers updated_at) |
| Booléens `0/1` | `TINYINT(1)` |
| **FTS5 + `remove_diacritics 2`** | **`FULLTEXT` InnoDB + `MATCH…AGAINST`** ; accent-insensibilité via **collation** `utf8mb4_0900_ai_ci`/`utf8mb4_unicode_520_ci` ; plus de table virtuelle ni triggers FTS ; garder `auteur_nom` dénormalisé indexé FULLTEXT |
| `COLLATE NOCASE` | `utf8mb4_unicode_ci` / `_ai_ci` |
| Unique partiel `WHERE … IS NOT NULL` | Index `UNIQUE` standard (NULL non comparés en MySQL → fonctionne) — à valider |
| `CHECK(...)` | `ENUM('pdf','epub',…)` ou CHECK MySQL 8, sinon validation PHP |
| Triggers `chemin` (`\|\|`) | `CONCAT()` ou calcul en PHP à l'écriture (recommandé) |
| `PRAGMA foreign_keys/WAL/…` | Sans objet (InnoDB) |
| `better-sqlite3` synchrone | **PDO MySQL**, requêtes préparées (paramètres liés) |

Évolution des schémas Index : `dbml-260420` (obsolète) → `dbml-260421` → `schema_T0.2_v2` (canonique SQL, triggers/seeds) → `v3_imports` (ajoute `role_oeuvre_access`, `import_sources`/`import_runs`) → **`v4_sources_simple` (cible : `import_runs` fusionné)**. Retenir v4 pour les tables + v2.sql pour triggers/seeds.

## Annexe D — Sort des outils et modules

| Élément | Sort |
| --- | --- |
| `serveur/epuriel/workers/*.py` (Telegram) | Workers atelier officiels → rediriger vers staging, renommer dossier |
| `outils/telechargeur_msg_telegram/` | Archiver (doublon du worker serveur) |
| `outils/telechargeur_fichiers_telegram/` | Autonome ; candidat worker PDF différé (remplacer SQLite local par base unique) |
| `outils/deduplicateur_pdf/dedup_md.py` | Autonome poste local (Ollama) ; aligner README↔code |
| `outils/diagnostic_post_epuriel/` | Archiver/refondre (teste header jeton caduc) |
| `apps/pdfmd/` | Atelier/référence, jamais app principale ; cible « mktplus » hors périmètre ; briques OCR récupérables plus tard |
| `index-lulumineux` (dépôt) | Archiver après récupération schémas/charte/maquette ; `apps/web` et `packages/*` vides (rien à porter) |

## Annexe E — Capacités serveur o2switch (à préserver/contraindre)

PHP web+cli 8.1.34 · MariaDB 11.4.12 · `exec()`/`shell_exec()` OK · cron cPanel OK (binaire `/usr/local/bin/php`) · **Python système 3.6.8 inutilisable → venv py311** · PyMuPDF/Pillow/LiteLLM OK · **Ghostscript présent**, **Tesseract/OCRmyPDF/Poppler/Pandoc ABSENTS** · pas de VPS, pas de GPU, processus background tués (→ **Ollama local abandonné**, IA 100 % cloud via LiteLLM) · modèle robuste = **file `server_jobs` + cron `run_jobs.php`** (jamais de traitement long dans la requête web).

## Annexe F — Décisions verrouillées

Toutes les décisions de cadrage sont **fermées** — voir **Phase 0** (D1–D11, portabilité PWA, abstraction conservée, hors-ligne aucun, lots jetables). Seul travail de **conception** restant (technique, assigné à l'IA) : le **schéma exact des 4 tables `import_staging_*`** (Phase 3.5).
