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
- **Le format pivot fichier disparaît** : remplacé par l'**intégration directe au corpus** — la validation d'un lot conforme écrit en corpus en transaction (plus de zone de transit). On est en dev sans données de production : casser le pipeline pendant la transition est acceptable.
- **Lots jetables** : un lot est un espace de travail temporaire, effacé après import en base (sauf mode débogage). Seuls les repères de collecte (dernier / plus ancien document par source) sont conservés en base.
- **Nouveau dépôt `lumosphere`** : on y importe le code utile, on archive les deux anciens dépôts. **Renommage technique réduit** : on garde les `epuriel_*` internes (« Epuriel » = nom interne de l'atelier).
- **Constat technique clé** : l'app Epuriel est **déjà** un client web (tout passe par l'API PHP en `fetch` ; le chemin « navigateur » couvre déjà les 8 services). La migration full-web est donc facile ; le vrai chantier = **authentification serveur** + **conception du schéma corpus**.
- **Bénéfice inattendu** : le bug « failed to fetch » de l'autrice (Portugal) vient des **uploads multipart** du checkpoint. En full-web, la sauvegarde devient un petit POST de texte → la cause racine (MTU) disparaît probablement.

---

## Phase 0 — Décisions de cadrage ✅ VERROUILLÉES (20 juin 2026)

Toutes les décisions de cadrage ont été prises avec le chef de projet. Elles sont fermées.

- [x] **D1 — Stack.** Bâtir l'app unifiée sur **Epuriel : React/Vite + PHP + MySQL** (codé, fonctionnel). Plan SvelteKit/Node/SQLite de l'Index **abandonné** ; ses *spécifications* et son *schéma de données* restent la référence (code Index quasi vide — rien à porter).
- [x] **D2 — Une base MySQL = source de vérité.**
- [x] **D3 — Abandon du pivot fichier** → **intégration directe au corpus** à la validation d'un lot conforme (écriture en transaction ; plus de staging). *(Révisé : intégration ≠ publication, cf. cahier §9.)*
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
- [x] **Plus de tables `import_staging_*`** *(révisé)* : la validation d'un lot conforme écrit **directement** au corpus (transaction). Le modèle ex-pivot 3.4 sert seulement de cartographie atelier→corpus.

---

## Phase 1 — Documentation de référence (rédaction & validation)

La documentation est refondue **avant** le code : elle cadre l'IA qui développera. Chaque document est rédigé puis validé.

> **Principe de fusion documentaire.** Partir des documents **Lumosphère** comme socle produit (bibliothèque) et y **réintégrer les fonctions d'atelier Epuriel** que le cahier des charges délègue aujourd'hui à un « pipeline annexe séparé » (`cahier_des_charges-index_lulumineux.md` §12, §17.4). Ce qui était « 2 projets reliés par pivot » devient « 2 zones internes reliées par la validation du lot (intégration directe au corpus) ».

- [x] **1.0 — Créer le dépôt neuf `lumosphere`** (cf. D7) — *fait : dépôt + docs poussés sur GitHub ; reste : importer le code applicatif (Phase 2+)*. Et y importer le code utile (app React, API PHP, workers, docs fusionnées). Les anciens dépôts `pretraitement` et `index-lulumineux` seront archivés en fin de migration (Phase 9).

### Documents-socles à fusionner (entrées primaires)

- [x] **1.1 — Cahier des charges unifié.** Base = `index-lulumineux/docs/cahier_des_charges-index_lulumineux.md` (v5.1, quasi intégralement repris : 5 rôles, structure d'entrée, états C/R/P, organisation contenu, interface publique, recherche, éditeur, admin, médiathèque/bibliothèque/notifications, Telegram bot, IA, droits par œuvre, sauvegardes, exports, charte, accessibilité, phases). **Étendre** pour absorber les fonctions d'atelier Epuriel absentes : ingestion **multi-sources** (PDF, YouTube, HTML + Telegram), **lots** + dossiers numérotés, **journal**, **checkpoint**, **OCR/nettoyage/extraction**, **collecteurs cron**, **registre des modèles IA**. Réécrire le chapitre 12 (« import de documents préparés ») en **flux interne atelier → intégration directe au corpus**.
- [x] **1.2 — Document de spécification produit unifié.** — *fait : contenu absorbé dans le cahier (§3–5) + `_contexte-ia/00` (pas de fichier PRD séparé)*. Base = `index-lulumineux/docs/document_specifications-index_lulumineux.md` (PRD v3.0 : vision, 5 profils, objectifs — fiabilité avant rapidité, vie privée, 50 000 entrées). Y intégrer la vision « atelier + bibliothèque dans une seule application ».
- [x] **1.3 — Réconciliation des contradictions** — *faite : tranchées et reflétées dans cahier / stack / `_contexte-ia`* :
  - **SQLite → MySQL** (le cahier, la spec et l'architecture supposent SQLite partout : règles PRAGMA §9, better-sqlite3, WAL). MySQL = vérité ; SQLite = export local.
  - **Svelte/Node → React/PHP** (la stack Index §5 est rejetée ; LiteLLM, Zod, TanStack Table restent valables côté React/PHP).
  - **Pivot fichier → intégration directe au corpus** (plus de fichier pivot ni de tables de staging ; la validation d'un lot conforme écrit en corpus en transaction).
  - **« 2 projets séparés » / « ne jamais écrire dans les tables finales » → intégration contrôlée** (l'atelier écrit en corpus uniquement à la validation d'un lot conforme ; intégration ≠ publication).
  - **Cible locale Electron/Tauri (Index) → PWA installable, en ligne** (pas d'app Electron ni de consultation hors-ligne dans cette phase ; couche d'abstraction conservée pour un Tauri éventuel).

### Documents techniques et de cadrage à réécrire

- [x] **1.4 — Stack technique unifiée** `docs/4-stack_technique-lumosphere.md` remplaçant `docs/stack_technique-pretraitement.md` et `index-lulumineux/docs/architecture-index_lulumineux.md`. Figer : React/Vite + PHP + MySQL, full-web o2switch, file de jobs + cron (pas de Celery/RQ/Redis — trop lourd pour le mutualisé), abstraction conservée pour le futur local, export SQLite, recherche FULLTEXT MySQL + collation accent-insensible, authentification serveur. **Préserver** les décisions o2switch : pas de VPS, `exec()` + cron, `server_jobs`, contraintes capacités serveur.
- [x] **1.5 — README unique.** — *fait (`README.md` racine, harmonisé : intégration directe au corpus)*. Décrire un seul produit. **Corriger** : (a) l'incohérence de chemin config `README.md:143` (`/home/sc1phcv1381/...`) vs `bootstrap.php:5` (`/home2/mist2786/...`) ; (b) les **noms d'outils erronés** (`extracteur_bot_telegram`, `extracteur_fichiers_telegram_bot` cités dans le README **n'existent pas** ; les vrais dossiers sont `telechargeur_msg_telegram/` et `telechargeur_fichiers_telegram/`) ; (c) le bloc « Format pivot » et `POST /lots/{id}/pivot` → **intégration directe au corpus**.
- [x] **1.6 — CLAUDE.md + AGENTS.md.** — *fait : `CLAUDE.md` + `AGENTS.md` (pointeur, source unique) ; règles security/database/dal transposées (interdits + ligne DAL)*. Périmètre unifié ; interdictions révisées : « ne plus produire de fichier pivot », « authentification serveur obligatoire », « plus d'écriture directe dans le corpus sans validation » (remplace « ne jamais écrire dans les tables finales de Lumosphère »), conserver « pdfmd jamais app principale ». Transposer les `.cursor/rules/*.mdc` de l'Index (security, database, dal) en règles du CLAUDE.md fusionné. Mettre à jour les chemins de déploiement (`epuriel`→`lumosphere`).
- [x] **1.7 — Devbook de développement** — *fait : `docs/3-devbook_developpement-lumosphere.md` (prend le relais de ce devbook de migration) : bibliothèque / UI documentaire complète + toutes les chaînes de préparation, transposé React/PHP/MySQL/PWA + intégration directe*. Suivant les **phases du cahier** (chap. 26 : Phase 1 cœur éditorial web / Phase 2 modules / Phase 3 exports), augmentées des modules d'atelier.
- [x] **1.8 — format_pivot.md → modèle de données de staging.** — *sans objet : pivot ET staging abandonnés (intégration directe) ; le modèle ex-pivot 3.4 sert de cartographie atelier→corpus, cf. `_contexte-ia/02`*. Convertir en description des **tables `import_staging_*`**. Réconcilier les versions (Epuriel 3.4 fait foi ; Index 3.1 périmé) et **réintégrer le bloc `media`** (présent dans l'architecture/CDC, absent du pivot 3.1). Résoudre l'incohérence interne `date_debut/date_fin` vs `date_source_debut/date_source_fin`. Porter les enums (`type_document`, `type_segment`, `source.type`) en contraintes base. Porter la règle Telegram (themes + mots_cles validés requis) comme garde de passage à « validé ».
- [x] **1.9 — Trame de travail unifiée** `docs/2-trame_travail-lumosphere.md` fusionnant `docs/trame_travail-pretraitement.md` et `index-lulumineux/docs/trame_travail-index_lulumineux.md`.
- [x] **1.10 — Document IA directeur.** — *décisions IA actées (cahier §22, stack §8, `_contexte-ia`) : LiteLLM cloud, providers, défaut gemini, allowlist, journalisation*. Récupérer `docs/archive/E.5 — IaProvider, LiteLLM et Ollama.md` comme référence IA : LiteLLM gateway unique, **cloud only (Ollama local abandonné)**, providers configurables (openai/anthropic/mistral/deepseek/gemini/ollama_cloud), défaut `gemini`, allowlist des modèles, mémorisation serveur du couple provider+modèle, journalisation coût/latence. Récupérer aussi `tableau_modeles_ia_a_valider.md` (règle d'allowlist).
- [x] **1.11 — Conventions de traitement à récupérer de l'archive** — *fait : `docs/conventions_traitement-lumosphere.md` (formatage RAG, garde-fou anti-résumé, chaîne YouTube ; SDK Google→LiteLLM, Celery/Redis/S3→jobs+cron, pivot→intégration directe)*. Sources : `info - Formatage_md_pour_rag.md` (chunking, front-matter, anti-résumé) ; logique YouTube (`Youtube*.md` : yt-dlp + youtube-transcript-api, 2 passes Map/Clean, garde-fou anti-résumé >20 %, timecodes) **en abandonnant** le SDK Google natif (→ LiteLLM) et Celery/RQ/Redis/S3 (→ file de jobs + cron).
- [x] **1.12 — Récupération d'artefacts depuis `index-lulumineux` avant archivage** (cf. D7) — *fait : schémas Index copiés dans `docs/_reference/index-corpus-schema/` (v4 dbml + v2 sql + triggers-fts5) ; charte intégrée (cahier §28) ; maquette = démo AIStudio*. Sources : `db/schema_T0.2_v4_sources_simple.dbml` + `db/schema_T0.2_v2.sql` (triggers/seeds), `triggers-fts5.txt`, `docs/Charte_couleurs_UI.docx` + CDC §24 (orange / violet-mauve / gris, clair-sombre), `docs/Lumosphere-accueil.excalidraw` (maquette accueil).
- [x] **1.13 — pdfmd : clarifier le hors-périmètre.** — *acté : `apps/pdfmd/` = atelier de référence, jamais l'app principale (CLAUDE.md) ; récupération OCR différée*. Les docs `apps/pdfmd/docs/*` visent l'intégration dans **« mktplus »** (éditeur tiers Muya), **hors cible Lumosphère**. Ajouter un encart « cible mktplus = hors périmètre » ; décider archivage de cette piste vs récupération différée des briques OCR. **Ne pas** inclure pdfmd dans la vague de renommage.

---

## Phase 1bis — Pack de contexte pour l'IA codeuse (optimisation des tokens)

Objectif : éviter de faire ingérer ~70 fichiers (dont l'archive redondante et contradictoire) à l'IA qui codera, et **économiser les tokens**. Se place **après** la fusion documentaire (Phase 1, dont elle est le condensé) et **avant** le codage.

- [x] **1bis.1 — Produire un dossier `docs/_contexte-ia/`** : 3 à 5 documents de référence **courts, dédupliqués, sans contradictions, faisant autorité** (6 fichiers produits, en anglais, token-optimisés) :
  - `00_contexte-produit.md` — vision, périmètre, **décisions Phase 0 verrouillées** (1 page).
  - `01_architecture.md` — stack React/Vite + PHP + MySQL, full-web/PWA, abstraction, file de jobs + cron, contraintes o2switch (capacités, venv Python, OCR absent).
  - `02_schema-donnees.md` — schéma cible unifié (atelier + corpus + auth), conventions (FK par `lot_id`, collation accent-insensible, FULLTEXT), repères de collecte, cycle de vie jetable des lots.
  - `03_conventions-et-regles.md` — règles métier (états, droits par œuvre, suppression douce…), conventions de code, interdits.
  - `04_flux-et-api.md` — routes API, flux atelier → corpus (intégration directe), auth session.
- [x] **1bis.2 — Principes** : autorité unique (un seul endroit par sujet), **exclusion de l'archive** du contexte de codage, liens vers les docs détaillées seulement si nécessaire. C'est ce pack que l'IA codeuse lit en priorité.

---

## Phase 2 — Base MySQL : renommage et unification des comptes

**Faits techniques :** MySQL **ne renomme pas une base en place** ; cPanel/o2switch n'a pas de bouton « renommer ». Voie fiable : sauvegarde → création nouvelle base → import → bascule config → nettoyage. **Préfixe de compte imposé** → le nom réel est `mist2786_lumosphere`. **Bonne nouvelle code** : `bootstrap.php` lit `db_name` depuis `config.php` (`epuriel_pdo`, `bootstrap.php:83-95`) → la **connexion** ne change pas ; seuls la migration des données et les **références littérales** changent.

### 2.1 — Sauvegarde et préparation

- [x] Sauvegarde complète (SSH lumosphere ouverte) : `mysqldump --defaults-extra-file=/home2/mist2786/.my.cnf mist2786_epuriel > ~/backup_epuriel_AAAAMMJJ.sql`. Vérifier taille/intégrité.
  - Fichier : `~/backup_epuriel_20260620.sql` — 301 Ko — `Dump completed on 2026-06-20 17:45:08` ✓
  - `.my.cnf` créé (`chmod 600`) — connexion testée (11 tables visibles) ✓

### 2.2 — Création de la nouvelle base

- [x] Créer `mist2786_lumosphere` via cPanel (préfixe auto `mist2786_`).
- [x] Créer l'utilisateur applicatif `mist2786_lumo_usr` (cohérence), **droits restreints SELECT/INSERT/UPDATE/DELETE uniquement** (jamais ALTER/CREATE/DROP — décision actée Bloc B / trame §858).
- [x] Affecter l'utilisateur à la base.

### 2.3 — Transfert des données (préserver le schéma acté)

- [x] Importer le dump : `mysql ... mist2786_lumosphere < ~/backup_epuriel_AAAAMMJJ.sql`. Vérifier nombre de tables/lignes.
  - 11 tables importées, comptages cohérents (lots:22, documents:22, server_jobs:73, ia_model_registry:133…) ✓
- [x] **Préserver intégralement le schéma de `mysql_schema_final_epuriel.sql`** : 7 tables (`lots`, `documents`, `journal_events`, `pivot_exports`, `collect_sources`, `sync_files`, `server_jobs`), MariaDB 11.4.12, utf8mb4/InnoDB, **FK par `lot_id` VARCHAR** (pas par `id` — contrainte de compat code/cron), `config_json` LONGTEXT + `JSON_VALID`, statut défaut `importe_raw`, ENUM de statuts (liste fermée), `date_source_debut` obligatoire pour tous, `run_every_hours`/`first_marker`/`enabled=non` sur `collect_sources`, hashes SHA-256, index actés.
  - Schéma préservé intégralement depuis le dump de `mist2786_epuriel` ✓
- [x] **Corriger** le `SET time_zone='+02:00'` codé en dur (heure d'été figée, archive Bloc B) → `Europe/Paris` dynamique.
  - Vérifié : `bootstrap.php:76` utilise déjà `$config['timezone'] ?? 'Europe/Paris'` ; PDO sans `SET time_zone` codé en dur ; dump standard `+00:00`. Aucune correction nécessaire ✓

### 2.4 — Bascule de la configuration

- [x] Éditer `/home2/mist2786/epuriel/config/config.php` (hors Git) : `db_name`→`mist2786_lumosphere`, `db_user`/`db_pass`.
  - Connexion PDO testée : `db=mist2786_lumosphere user=mist2786_lumo_usr lots=22` ✓

### 2.5 — Références littérales à renommer (voir Annexe A pour l'inventaire complet)

- [x] Nom de base `mist2786_epuriel` et **ancien `sc1phcv1381_epuriel`** : runbook, `mysql_schema_decisions_epuriel.md`, archives Bloc B, scripts.
  - Côté serveur : 1 seul résidu opérationnel (`tools/bloc-e-telegram-proof.sh:13` défaut `DB`) → corrigé en `mist2786_lumosphere` (sauvegarde `.bak`). Les crons lisent `config.php` (aucun nom en dur). ✓
  - Les autres fichiers de l'Annexe A (`bloc-e-telegram.runbook.md`, `mysql_schema_decisions_epuriel.md`, `trame_travail-pretraitement.md`, archives Bloc B) sont dans l'**ancien dépôt `pretraitement`** — non opérationnels, archivés en Phase 9. Aucune trace `sc1phcv1381` côté serveur.
- [x] Utilisateur `mist2786_epur_usr` / **ancien `sc1phcv1381_epuriel_usr`** → `mist2786_lumo_usr` + GRANTs.
  - `config.php` bascule sur `mist2786_lumo_usr` (Phase 2.4). Aucun nom d'utilisateur en dur côté serveur.
- [x] `grep -rn "mist2786_epuriel\|mist2786_epur_usr\|sc1phcv1381"` jusqu'à zéro résidu (hors archives volontairement conservées).
  - Contrôle serveur (hors `/venvs/` et `.bak`) : **zéro résidu** ✓

### 2.6 — Validation et nettoyage

- [x] Faire tourner API + crons sur la nouvelle base en test.
  - API live `GET /lots/waiting` → HTTP 200, données réelles depuis `mist2786_lumosphere` ✓
  - Cron `run_jobs.php` → connexion OK, file traitée sans erreur ✓
- [ ] **Puis seulement** supprimer l'ancienne base et l'ancien utilisateur. → **Différé volontairement** (filet de sécurité pendant la période de test ; suppression finale en Phase 9.5).
- [x] **Sécurité (cPanel)** : révoquer les `ALL PRIVILEGES` accordés à `mist2786_lumo_usr` pour l'import, revenir à `SELECT/INSERT/UPDATE/DELETE` uniquement (cf. 2.2). ✓ Fait. ⚠️ La création des tables corpus/auth (Phase 3) se fera via phpMyAdmin (compte cPanel), pas via l'utilisateur applicatif.

---

## Phase 3 — Schéma unifié : corpus + auth (chantier base de données)

C'est ici qu'on fusionne réellement les données. La base atelier (7 tables) existe ; il faut **ajouter** la zone corpus et l'auth (**pas de zone staging**). Source : schémas `index-lulumineux/db/schema_T0.2_v4_sources_simple.dbml` (tables) + `schema_T0.2_v2.sql` (triggers/seeds concrets). **Adaptation SQLite → MySQL** détaillée en Annexe C.

### 3.1 — Tables corpus éditorial (à créer en MySQL)

- [x] `auteurs`, `oeuvres` (FK→auteurs RESTRICT, `auteur_id NOT NULL`), `themes` (auto-référence `parent_id`, `chemin` matérialisé, **max 2 niveaux** appliqué en PHP), `etats` (seed C/R/P, `est_modifiable=0`), `citations` (`oeuvre_id NOT NULL`, `theme_id` nullable, `etat_id NOT NULL`, `telegram_message_id`, provenance `import_source_id`/`source_item_id`/`source_item_date`, **soft-delete `deleted_at`**, index composites), `keywords` (unicité insensible casse), `citation_keywords` (PK composite, CASCADE).
  - ✓ 2026-06-20 — 7 tables créées via `db/migrations/003_corpus_fulltext.sql` (phpMyAdmin). Vérifié : tables présentes, seed `etats` (À Corriger/À Réviser/Publiée, `est_modifiable=0`), GRANT app au niveau base. FK `import_source_id→import_sources` différée en 3.4.

### 3.2 — Recherche plein texte

- [x] Remplacer la table virtuelle FTS5 + ses 3 triggers par un **index `FULLTEXT` InnoDB** sur `citations(contenu, notes)` + colonne dénormalisée `auteur_nom` (maintenue à l'écriture). Base en collation **accent-insensible** (`utf8mb4_0900_ai_ci` MySQL 8 ou `utf8mb4_unicode_520_ci` MariaDB) pour l'équivalent de `remove_diacritics`. (Détails Annexe C.)
  - ✓ 2026-06-20 — Index `FULLTEXT ft_citations(contenu, notes, auteur_nom)` créé. Collation retenue : `utf8mb4_unicode_520_ci` (MariaDB 11.4.12). Accent/casse-insensibilité prouvée (`'éveil'='eveil'`, `'cœur'='coeur'` → 1).

### 3.3 — Tables authentification / autorisation (brique nouvelle)

- [x] `users` (email unique, prénom et nom, `password_hash` bcrypt, `role_id`), `roles` (seed : Administrateur **protégé**, Éditeur, Visiteur, Abo3, Abo4), `permissions`, `role_permissions`, **`role_oeuvre_access`** (droits Abo3/Abo4 par œuvre), `active_sessions`. + mécanique session/CSRF PHP (Phase 6.2).
  - ✓ 2026-06-22 — 6 tables auth créées via `db/migrations/004_auth.sql` (phpMyAdmin). Vérifié : tables présentes, 5 rôles, 16 permissions, associations rôle↔permission, intégrité FK, CASCADE. Décisions : prenom+nom séparés (devbook > DBML), active_sessions journal complet (admin only), role_oeuvre_access = présence = lecture.

#### Complément 3.3 — Stockage sessions & CORS ✓

> ✓ 2026-06-22 — Décisions validées par le chef de projet : (1) sessions fichier PHP natif, (2) CORS domaine exact (liste extensible pour futures apps Android/autres), (3) CSRF jeton par session. `active_sessions` = journal admin uniquement. Implémentation en Phase 6.2.

**Décision sessions** (~~à trancher~~ **validée**) :
| Option | Avantage | Inconvénient |
|--------|----------|--------------|
| **Fichier PHP natif** (recommandé v1) | Zéro config, natif o2switch, performant mono-serveur | Pas de visibilité admin sur sessions actives |
| **Table `active_sessions`** | Visibilité admin, invalidation ciblée, stats connexion | Complexité ajoutée, `session_set_save_handler()` custom |

→ **Recommandation** : fichier PHP natif en v1 (mono-serveur o2switch, pas de load-balancing). La table `active_sessions` sert uniquement de **journal de connexions** (log last_login, device, IP) et d'**invalidation admin** (forcer déconnexion). Pas de stockage session PHP dedans.

**Configuration CORS** (à appliquer dans `bootstrap.php`) :

- `Access-Control-Allow-Origin` : domaine exact, extensible en liste (pas `*`) pour que `credentials: 'include'` fonctionne. v1 = `lumosphere.org` seul ; futures apps (Android, etc.) ajoutées à la liste autorisée
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Headers: Content-Type, X-CSRF-Token`
- `SameSite=Lax` sur le cookie de session (protection CSRF implicite pour GET, token explicite pour POST/PUT/DELETE)

**CSRF** : token par session (pas par requête — simplifie le frontend SPA), stocké en `$_SESSION['csrf_token']`, envoyé via header `X-CSRF-Token` sur les mutations.

### 3.4 — Tables modules

- [x] `mediatheque`, `bibliotheque`, `notifications`, `config`, `emojis`, `export_jobs`, `schema_version`, `user_favorites`, `local_favorites`. **`import_sources` et `telegram_channels` abandonnées** : `collect_sources` (existante) sert de table unique de traçabilité (décision chef de projet 2026-06-22). ALTER `collect_sources` : ajout `oeuvre_id` FK→oeuvres + extension ENUM source_type (pdf, other). FK différée `citations.import_source_id → collect_sources(id)` fermée.
  - ✓ 2026-06-22 — 9 tables créées, 2 ALTER appliqués via `db/migrations/005_modules.sql` (phpMyAdmin). Vérifié : tables présentes, ENUM étendu, FK collect_sources→oeuvres, FK citations→collect_sources, CASCADE user_favorites, seed schema_version (3 entrées).

### 3.5 — Pas de zone staging (intégration directe) *(révisé)*

- [x] **Aucune table de staging** : la validation d'un lot conforme (jeu complet thème+date+auteur+mots-clés, sans doublon) écrit **directement** au corpus, en **transaction** (tout ou rien), puis le lot est supprimé. Le modèle ex-pivot 3.4 (`document`/`source`/`segments`/`indexation`/`media`) sert de **cartographie atelier→corpus** (cf. `_contexte-ia/02`).
- [x] **Abandonner `pivot_exports`** : `DROP TABLE IF EXISTS pivot_exports` dans `db/migrations/005_modules.sql`.
- [x] **Abandonner `sync_files`** (cf. D5 / Phase 3bis) : `DROP TABLE IF EXISTS sync_files` dans `db/migrations/005_modules.sql`.
  - ✓ 2026-06-22 — tables pivot_exports et sync_files supprimées. Vérifié via 005_verify.sql (requête 6 : 0 lignes).

### 3.6 — Règles métier à porter dans la couche PHP (architecture Index §10)

- [x] État défaut citation = `À Corriger` ; `Publiée` interdit sans thème ; états C/R/P non supprimables ; Administrateur non supprimable/non réductible ; thèmes ≤ 2 niveaux ; mots-clés normalisés (unicité insensible casse) ; **suppression douce `deleted_at`** filtrée systématiquement ; **droits par œuvre appliqués à TOUTES les lectures** (pas un masquage UI) ; validation avant écriture (Zod React + validation PHP) ; pagination keyset (pas OFFSET) ; verrous d'édition concurrente via `SELECT … FOR UPDATE` (remplace le mécanisme PostgreSQL suggéré dans l'archive — **MySQL retenu**). — *fait : DAL PHP complet (`api/dal/` — 10 modules, 11 règles R1→R11) ; 60 tests PHPUnit · 122 assertions · 0 erreur ; validé gitleaks 8.22.1.*

### 3.7 — Seeds

- [x] Charger le référentiel **thèmes/sous-thèmes** depuis `docs/themes-lumosphere.md` (4 thèmes + sous-thèmes + descriptions) dans `themes` ; relier l'indexation des segments à ce référentiel (FK/validation au lieu de chaînes libres). Fin de `refs/lumosphere_referentiel.json` (le référentiel devient lecture interne directe en base). — *fait : `docs/themes-lumosphere.md` créé (4 thèmes × 3 sous-thèmes) ; seed `db/migrations/006_themes_seed.sql` (16 entrées, idempotent) ; 11 tests PHPUnit SeedThemesTest · 71 tests suite complète · 0 erreur.*

---

## Phase 3bis — Cycle de vie des lots simplifié (lots jetables)

Décision du chef de projet : **ne conserver aucune trace des étapes**, sauf en mode débogage. Un lot devient un espace de travail temporaire.

> **Séquençage (important)** : seule la part « réglages + règles » est faisable avant la Phase 4 (aucune dépendance). Le reste dépend du **portage des chaînes** (Phase 4) et de l'**intégration corpus** (Phase 6.3) : voir les préfixes `[maintenant]` / `[Phase 4]` / `[Phase 6.3]` ci-dessous.

- [x] **[maintenant]** **Mode débogage global** (`config.mode_debug_global`, **défaut OFF**) — *fait : seed `007_config_seed.sql` + `api/dal/config.php` (`dal_is_debug_mode`), 7 tests ConfigTest.* Décision chef de projet : **global seulement** (pas d'override par lot).
- [x] **[maintenant]** **Durée de rétention du journal** (`config.journal_retention_days = 90`) — *fait : seed `007_config_seed.sql`.*
- [x] **[sans objet]** **Persister en base, par source auto-collectée** (Telegram, YouTube, HTML — pas le PDF manuel) : `collect_sources.last_marker` + `first_marker`. **Déjà présents** au schéma, rien à faire.
- [ ] **[Phase 6.3]** Après intégration réussie au corpus (écriture vérifiée), **effacer tout le dossier du lot** : `0_raw/` (source brute incluse), dossiers d'étapes intermédiaires, `*_exports/`, `manifest.json`, `journal.csv`. Respecte `mode_debug_global`.
- [ ] **[Phase 6.3]** Nettoyage **automatique** après import réussi (aujourd'hui surtout manuel via `epuriel_handle_lot_delete`) ; nettoyage volontaire conservé pour les résidus.
- [ ] **[Phase 4]** Supprimer la production de `manifest.json` + `journal.csv` par lot (la base est la vérité) et des dossiers `*_exports/`.
- [ ] **[Phase 4]** **Journal réduit** : suivi léger en base (créé / pris / validé / supprimé, erreurs) ; pas de trace par étape ; brancher l'élagage à `journal_retention_days` (cron `run_jobs.php`).
- [ ] **[Phase 4]** `telegram_updates_buffer` **purgé** systématiquement après agrégation en lot.
- [ ] **[Phase 4]** Adapter `epuriel_ensure_lot_dirs` / `epuriel_source_dirs` (`bootstrap.php`) vers un dossier de travail minimal et transitoire.

---

## Phase 4 — Arborescence serveur, Python et capacités o2switch

### 4.1 — Arborescence et chemins

- [ ] **Chemin codé en dur** `bootstrap.php:5` (`EPURIEL_CONFIG_PATH`) + env `EPURIEL_CONFIG` (`:66`).
- [ ] **Entrée web publique** → racine de l'app unifiée sur `lumosphere.org` (même origine que le front → CORS simple + cookies d'auth). **Décision** : le **dossier atelier interne** `/home2/mist2786/epuriel/` (config, cron, workers, lots, reports, refs, venvs) **est migré** : copier les fichiers nécessaires depuis `epuriel/` vers `public_html/` (sous-dossier dédié si nécessaire) puis recréer le venv. L'ancien `epuriel/` est destiné à disparaître.
- [ ] Chemins dérivés dans le code : `epuriel.php:1367,1424,1512,1823,2532,2876` (cron/workers, dont le segment littéral `/epuriel/` dans `dirname(__DIR__,3).'/epuriel/workers/process_telegram_v1.py'`).
- [ ] Crons cPanel (`collect_telegram_bot.php`, `agregateur_telegram.php`, `run_jobs.php`) + `reports/` : chemins `lumosphere`. Binaire cron `/usr/local/bin/php`.
- [ ] `config.php` : `python_bin`, `venv_path`, `lots_root`, `bin_ghostscript`.

### 4.2 — Python et capacités (récupérer les procédures d'archive)

- [ ] **Python système o2switch = 3.6.8 → inutilisable.** Recréer le venv **py311** (3.11.15) sous `public_html/.../venvs/py311` (cible `lumosphere/`, plus `epuriel/`) et pointer `python_bin` dessus. En local : venv `.venv` en Python 3.13 + `ruff` via `pipx` (cf. `.claude/rules/python-workers.md`). Procédure serveur : `procedure_configurer_outils_serveur.md`.
- [ ] Capacités confirmées (`serveur.local.md`, `procedure_test_capacites_serveur.md`) : `exec()`/cron OK, PyMuPDF/Pillow/LiteLLM OK, **Ghostscript présent** (`/usr/bin/gs`), **Tesseract/OCRmyPDF/Poppler ABSENTS**, **Pandoc absent**. Conséquence : chaîne **PDF OCR contrainte** (à reporter / valider) ; **EPUB Pandoc** (phase 3) nécessite un binaire embarqué.
- [ ] Conserver le **modèle file de jobs + cron** (`server_jobs` + `run_jobs.php`) pour tout traitement long — ne jamais lancer le lourd dans la requête web (scénario « Cas C » de la procédure capacités).
- [ ] Réécrire le health-check schéma (ex-`verifier_bloc_b.php`, archive) pour le schéma complet et le nom `lumosphere`.

#### Complément Phase 4 — Décision OCR

**Constat** : Tesseract, OCRmyPDF, Poppler et Pandoc sont **absents** sur o2switch. Pas d'accès root pour installer des paquets système.

**Options** :
| Option | Faisabilité | Impact |
|--------|------------|--------|
| **A. Différer OCR à une phase ultérieure** (recommandé v1) | Immédiat | Chaîne PDF limitée aux PDF textuels (PyMuPDF extrait le texte natif). PDF scannés = non supportés en v1. |
| **B. Compiler Tesseract dans le venv** | Complexe (dépendances C++, leptonica) | Fragile sur mutualisé, maintenance lourde |
| **C. Service OCR externe (cloud)** | Simple à intégrer (API REST) | Coût récurrent, dépendance externe, données envoyées hors serveur |
| **D. Traitement local (machine dev) + upload résultat** | Fonctionnel | Workflow manuel, pas automatisable via cron |

→ **Recommandation** : Option A pour la v1. Les PDF textuels (majorité des sources éditoriales) sont traités via PyMuPDF. Les PDF scannés sont signalés à l'éditeur ("OCR non disponible, PDF ignoré"). Réévaluer en v2 (option C si budget, option D sinon).

**Pandoc** (EPUB, Phase VI) : même situation. Compiler un binaire statique ou utiliser un service de conversion. À traiter au moment de Phase VI.

#### Complément Phase 4 — Lots jetables (report de la Phase 3bis)

> Ces tâches viennent de la **Phase 3bis** (cycle de vie « lot jetable »). Elles modifient le code des chaînes de préparation, qui n'existe qu'à partir d'ici → à traiter **pendant le portage des chaînes** (T28–T35). Le réglage `mode_debug_global` et `journal_retention_days` sont **déjà en base** (seed `007`, Phase 3bis « maintenant »).

- [ ] Adapter `epuriel_ensure_lot_dirs` / `epuriel_source_dirs` (`bootstrap.php`) vers un **dossier de travail minimal et transitoire** (plus de sous-dossiers d'étapes superflus).
- [ ] **Supprimer la production de `manifest.json` + `journal.csv`** par lot (la base est la vérité) et des dossiers `*_exports/`.
- [ ] **Journal réduit** : suivi léger en base `journal_events` (créé / pris / validé / supprimé, erreurs) ; pas de trace par étape ; **brancher l'élagage** des entrées plus vieilles que `config.journal_retention_days` (90 j) au cron `run_jobs.php`.
- [ ] **Purger `telegram_updates_buffer`** systématiquement après agrégation en lot.

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

- [x] Jeton actuel = secret partagé en clair côté client (`mockServices.ts:37,64,101`, env de build) — à supprimer. *(Plus de jeton client — authentification par session PHP.)*
- [x] Créer `/auth/login` + `/auth/logout` (PHP), session (`session_start`, cookie `httpOnly`/`Secure`/`SameSite`), CSRF. *(Implémenté dans `api/endpoints/auth.php` + `api/dal/auth.php` + `api/bootstrap.php`. Rate-limit 5 tentatives / 30 min. Expiration session 2 h.)*
- [x] Frontend : `fetch(..., { credentials: 'include' })`, méthodes `login`/`logout`/`setup` dans `src/services/api.ts`. *(Écran de login = T09.)*
- [x] Implémenter les **rôles** (Phase 3.3) et **mettre fin au « tout utilisateur admin » V1**. *(Rôles chargés à la connexion via `dal_auth_load_permissions()`. Premier admin créé via `/auth/setup` protégé par code secret.)*
- [x] Étendre Gitleaks aux secrets d'auth/session. *(`.gitleaks.toml` : règles pour session PHP, bcrypt, setup_secret, CSRF token, mot de passe BDD, config.php.)*

### 6.3 — Abandon du fichier pivot → intégration directe au corpus

- [ ] Réécrire `epuriel_handle_lot_pivot` (`epuriel.php:2307`) et `epuriel_register_generated_pivot_export` (`:2593`) : à la validation d'un lot conforme, **INSÉRER directement dans le corpus** (transaction) au lieu d'écrire `4_exports/*.pivot.json` + `pivot_exports`. Les deux origines actuelles (upload de fichier `.pivot.json` `:2315-2431` ; génération depuis révision `mode=generate_from_revision` `:2436`) convergent vers l'intégration corpus.
- [ ] Adapter le worker `process_telegram_v1.py` (lancé `:2521` avec `--export-pivot`) : écrire en base, **ou** parser sa sortie JSON côté PHP et insérer au corpus. **Nouvelle capacité** : les workers Python ne se connectent pas à MySQL aujourd'hui → ajouter PDO/MySQL au worker, ou conserver le parsing côté PHP.
- [ ] Conserver les validateurs (`epuriel_validate_minimal_pivot:3241`, `epuriel_validate_telegram_pivot:3269`) comme **garde de conformité avant intégration** ; porter la règle Telegram (thèmes + mots-clés requis). *(L'entrée intégrée arrive en « À Corriger » ; passage à « Publiée » = acte humain distinct, cf. cahier §11.)*
- [ ] Frontend : `exportTelegramPivot`/`generateTelegramPivotFromRevision` gardent la même route mais ne manipulent plus de fichier ; `pivotSummary.ts` affiche le **contenu préparé du lot** ; l'onglet « Erreurs et export pivot » (`UI Epuriel.md` §4.4) devient onglet « Validation / intégration ».

**Suppression du lot après intégration (report de la Phase 3bis) :**

- [ ] Après intégration réussie au corpus (**écriture vérifiée**), **effacer tout le dossier du lot** : `0_raw/` (source brute incluse), dossiers d'étapes intermédiaires, `*_exports/`, `manifest.json`, `journal.csv`. **Respecter `config.mode_debug_global`** (`dal_is_debug_mode()` dans `api/dal/config.php`) : si ON, conserver le dossier pour diagnostic.
- [ ] Nettoyage **automatique** après import réussi (remplace la suppression aujourd'hui surtout manuelle via `epuriel_handle_lot_delete`) ; nettoyage volontaire conservé pour les résidus.

#### Complément 6.3 — Machine d'états des lots

```
┌──────────┐   créé par     ┌────────────┐   pris en charge   ┌─────────────┐
│ en_attente│──────────────→│ en_cours    │──────────────────→│ en_traitement│
└──────────┘   collecte/    └────────────┘   éditeur          └─────────────┘
               upload              ↑                                  │
                                   │                    succès worker │  échec worker
                                   │                                  ↓          ↓
                              ┌────┴───────┐              ┌──────────┐  ┌───────┐
                              │ à_reprendre │←─────────────│ en_révision│  │erreur │
                              └────────────┘  renvoi      └──────────┘  └───────┘
                                                                │              │
                                                   validation   │    retry     │
                                                                ↓              ↓
                                                          ┌─────────┐   retour en
                                                          │  prêt   │   en_traitement
                                                          └─────────┘
                                                                │
                                                   intégration  │  échec conformité
                                                   (transaction)↓         ↓
                                                          ┌─────────┐  retour
                                                          │ intégré │  en_révision
                                                          └─────────┘  (+ erreurs)
```

**Transitions valides** :
| De → Vers | Déclencheur | Action |
|-----------|-------------|--------|
| `en_attente` → `en_cours` | Éditeur prend le lot | Assignation `editor_id` |
| `en_cours` → `en_traitement` | Lancement job | `server_jobs` créé |
| `en_traitement` → `en_révision` | Worker terminé OK | Contenu prêt |
| `en_traitement` → `erreur` | Worker échoué | Log erreur dans `journal_events` |
| `erreur` → `en_traitement` | Retry (éditeur/admin) | Nouveau job créé |
| `en_révision` → `prêt` | Éditeur valide conformité | Garde vérifiée (jeu complet) |
| `en_révision` → `à_reprendre` | Éditeur renvoie | Corrections nécessaires |
| `à_reprendre` → `en_cours` | Éditeur reprend | Cycle recommence |
| `prêt` → `intégré` | Intégration corpus (transaction) | Lot supprimé |
| `prêt` → `en_révision` | Échec conformité | Erreurs affichées |

**Règles** :

- Seuls `erreur` et `à_reprendre` permettent un retour en arrière
- `intégré` est un état terminal (lot supprimé physiquement, **sauf si `mode_debug_global` est ON** → dossier conservé pour diagnostic)
- Pause optionnelle : tout état sauf `intégré` peut être mis en `pausé` (gel temporaire)

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

- [ ] **8.1 — Workers Telegram serveur** (`serveur/epuriel/workers/collect_telegram_history.py`, `telegram_history_auth.py`) : **workers atelier officiels** (déjà intégrés, appelés par PHP via `exec()`, sortie JSON par stdout, session Telethon serveur). Rediriger leur sortie vers l'**intégration corpus** (6.3). Renommer dossier `serveur/lumosphere/workers/`. (Ils n'ont aucun chemin/DB en dur — purement CLI.)
- [ ] **8.2 — `outils/telechargeur_msg_telegram/main-v3.py`** : **archiver** (doublon/ancêtre du worker serveur).
- [ ] **8.3 — `outils/telechargeur_fichiers_telegram/`** (téléchargeur de PDF Telegram, SQLite local autonome `telegram_downloads.db`) : **autonome, hors périmètre immédiat** ; candidat à devenir un worker d'ingestion PDF plus tard (remplacer son SQLite par la base unique, rediriger vers `0_raw` puis intégration corpus).
- [ ] **8.4 — `outils/deduplicateur_pdf/dedup_md.py`** : **autonome, poste local** (dépend d'Ollama local, non portable o2switch). **Aligner README ↔ code** (le README décrit du PDF, le code travaille en Markdown via rapidfuzz + Ollama).
- [ ] **8.5 — `outils/diagnostic_post_epuriel/`** : teste le header `X-Epuriel-Token` (caduc avec l'auth session) → **archiver ou refondre** pour tester login/session.
- [ ] **8.6 — `apps/pdfmd/`** : **reste atelier/référence, jamais app principale** (CLAUDE.md). Cible documentée « mktplus » = hors périmètre Lumosphère. Récupération différée possible des briques OCR (`1.ocr_pdf.sh`, EasyOCR, `pdf_extractor.py`) comme futurs workers PDF, **sous réserve** de valider OCR sur o2switch (absent aujourd'hui). Ne pas renommer dans la vague `epuriel→lumosphere`.

---

## Phase 9 — Vérification, bascule et nettoyage

- [ ] **9.1** — `pnpm lint` + `pnpm build` verts (dossier app). Conserver le socle qualité (Vitest, Playwright, Ruff, PHPStan, PHPCS, Gitleaks).
- [ ] **9.2** — Tests des nouveaux endpoints : login/session, validation/intégration corpus. Conserver les tests destructifs préfixés (`TEST_E0B3_`), migrer URL/vars de test.
- [ ] **9.3** — Vérification manuelle ciblée : login, liste des lots, révision, validation → intégration au corpus, recherche accent-insensible.
- [ ] **9.4** — Mettre à jour le runbook Telegram (`bloc-e-telegram.runbook.md`, `bloc-e-telegram-proof.sh`) : variables/chemins (`DB`, `BASE_DIR`, `BOOTSTRAP`, `EPURIEL_CONFIG`, crons, reports) ; remplacer les assertions « fichier pivot présent » par « entrée intégrée au corpus ».
- [ ] **9.5** — Suppression de l'ancienne base et de l'ancien dossier serveur (après période de test).
- [ ] **9.6** — Archivage des **deux anciens dépôts** `pretraitement` et `index-lulumineux` (le dépôt actif devient `lumosphere`, cf. 1.0 ; après récupération des artefacts 1.12).
- [ ] **9.7** — Mise à jour de la mémoire projet.

---

## Annexe A — Inventaire des références à renommer

| Élément                                                       | Emplacements                                                                                                                                                                                                                                   |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base `mist2786_epuriel` (+ ancien `sc1phcv1381_epuriel`)      | `docs/bloc-e-telegram.runbook.md` (var `DB`, l.33/162/294/309), `docs/mysql_schema_decisions_epuriel.md:5`, `docs/archive/mysql_intervention_ssh_epuriel.md`, `docs/archive/mysql_schema_final_epuriel.sql` (en-tête), Bloc B (ancien compte)  |
| Utilisateur `mist2786_epur_usr` (+ `sc1phcv1381_epuriel_usr`) | `docs/archive/mysql_intervention_ssh_epuriel.md:47`, `docs/trame_travail-pretraitement.md:858`, archives Bloc B                                                                                                                                |
| Chemins `/home2/mist2786/epuriel/`                            | `README.md:97-117`, `CLAUDE.md:82-85`, `AGENTS.md:13-15`, `stack_technique-pretraitement.md:156-162,259-261`, `document_specification-pretraitement.md:502`, `trame_travail-pretraitement.md:151-178`, runbook (multiples), `serveur.local.md` |
| Config codée en dur                                           | `.remote/lumosphere-api/bootstrap.php:5,66`                                                                                                                                                                                                    |
| Connexion base (lit `db_name` — pas de modif code)            | `bootstrap.php:83-95` (`epuriel_pdo`)                                                                                                                                                                                                          |
| Chemins workers/cron dérivés                                  | `epuriel.php:1367,1424,1512,1823,2532,2876`                                                                                                                                                                                                    |
| Header `X-Epuriel-Token`                                      | `bootstrap.php:45,142`, `apiClient.ts:68`, `electronServices.ts:67`, `mockServices.ts:101`                                                                                                                                                     |
| Fonctions `epuriel_*` (~130) + routeur                        | `.remote/lumosphere-api/bootstrap.php`, `epuriel.php`                                                                                                                                                                                          |
| Symboles/clés/vars frontend                                   | `contracts.ts:1,7,395`, `uiContract.ts:94`, `createServices.ts:5`, `useEpurielAppController.ts:287`, `mockServices.ts:37`, `vite-env.d.ts:5,22`, `preload/index.ts:7,24,26`, `.env.test.api.*`, `vitest.api.config.ts`                         |
| Workers Python (docstrings) + dossier                         | `serveur/epuriel/workers/collect_telegram_history.py`, `telegram_history_auth.py`                                                                                                                                                              |
| Chemin config incohérent à corriger                           | `README.md:143` (`/home/sc1phcv1381/...`) vs `bootstrap.php:5`                                                                                                                                                                                 |
| Noms d'outils erronés dans le README                          | `README.md:330-355` (`extracteur_*` inexistants → `telechargeur_*`)                                                                                                                                                                            |

## Annexe B — Inventaire des routes API et tables touchées (`epuriel.php`)

`/lots/create` (lots, journal_events) · `/lots/{id}/0_raw` (lots, documents, server_jobs, journal_events) · `/lots/{id}/take` (lots, journal_events) · `/lots/delete/preview` + `/lots/delete` (DELETE dynamique sur toutes tables à `lot_id`) · `/lots/{id}/checkpoint` (sync_files, documents, journal_events) · `/lots/{id}/pivot` (**→ intégration directe au corpus**, lots, documents, journal_events) · `/ia/settings` GET/POST · `/ia/models/refresh|registry/save|test` (ia_model_registry, ia_model_catalog_cache) · `/lots/{id}/ia/regenerate` (server_jobs, documents, journal_events) · `/lots/waiting` · `/telegram/sources` GET/POST (collect_sources) · `/telegram/lots/create-from-buffer` + `collect-and-create` (telegram_updates_buffer, lots, documents, server_jobs) · `/telegram/history/auth/start|confirm` (script Python) · `/lots/{id}/files` + `/files/read` · `/lots/{id}` (détail).
**Tables :** lots, documents, journal_events, server_jobs, sync_files, pivot_exports, collect_sources, telegram_updates_buffer, ia_model_registry, ia_model_catalog_cache, + réglages IA. **Config lue :** api_token, db_*, lots_root, python_bin, timezone, clés IA.

## Annexe C — Adaptation schéma SQLite → MySQL (zone corpus)

| SQLite (Index)                       | Cible MySQL/MariaDB                                                                                                                                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INTEGER PRIMARY KEY AUTOINCREMENT`  | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY`                                                                                                                                                                                  |
| `TEXT` générique                     | `VARCHAR(n)` (clés/courts), `TEXT`/`MEDIUMTEXT` (contenu), `LONGTEXT` (Markdown long)                                                                                                                                      |
| `updated_at` via trigger             | `DATETIME … ON UPDATE CURRENT_TIMESTAMP` (supprime les triggers updated_at)                                                                                                                                                |
| Booléens `0/1`                       | `TINYINT(1)`                                                                                                                                                                                                               |
| **FTS5 + `remove_diacritics 2`**     | **`FULLTEXT` InnoDB + `MATCH…AGAINST`** ; accent-insensibilité via **collation** `utf8mb4_0900_ai_ci`/`utf8mb4_unicode_520_ci` ; plus de table virtuelle ni triggers FTS ; garder `auteur_nom` dénormalisé indexé FULLTEXT |
| `COLLATE NOCASE`                     | `utf8mb4_unicode_ci` / `_ai_ci`                                                                                                                                                                                            |
| Unique partiel `WHERE … IS NOT NULL` | Index `UNIQUE` standard (NULL non comparés en MySQL → fonctionne) — à valider                                                                                                                                              |
| `CHECK(...)`                         | `ENUM('pdf','epub',…)` ou CHECK MySQL 8, sinon validation PHP                                                                                                                                                              |
| Triggers `chemin` (`\|\|`)           | `CONCAT()` ou calcul en PHP à l'écriture (recommandé)                                                                                                                                                                      |
| `PRAGMA foreign_keys/WAL/…`          | Sans objet (InnoDB)                                                                                                                                                                                                        |
| `better-sqlite3` synchrone           | **PDO MySQL**, requêtes préparées (paramètres liés)                                                                                                                                                                        |

Évolution des schémas Index : `dbml-260420` (obsolète) → `dbml-260421` → `schema_T0.2_v2` (canonique SQL, triggers/seeds) → `v3_imports` (ajoute `role_oeuvre_access`, `import_sources`/`import_runs`) → **`v4_sources_simple` (cible : `import_runs` fusionné)**. Retenir v4 pour les tables + v2.sql pour triggers/seeds.

## Annexe D — Sort des outils et modules

| Élément                                   | Sort                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `serveur/epuriel/workers/*.py` (Telegram) | Workers atelier officiels → rediriger vers intégration corpus, renommer dossier                                  |
| `outils/telechargeur_msg_telegram/`       | Archiver (doublon du worker serveur)                                                                             |
| `outils/telechargeur_fichiers_telegram/`  | Autonome ; candidat worker PDF différé (remplacer SQLite local par base unique)                                  |
| `outils/deduplicateur_pdf/dedup_md.py`    | Autonome poste local (Ollama) ; aligner README↔code                                                              |
| `outils/diagnostic_post_epuriel/`         | Archiver/refondre (teste header jeton caduc)                                                                     |
| `apps/pdfmd/`                             | Atelier/référence, jamais app principale ; cible « mktplus » hors périmètre ; briques OCR récupérables plus tard |
| `index-lulumineux` (dépôt)                | Archiver après récupération schémas/charte/maquette ; `apps/web` et `packages/*` vides (rien à porter)           |

## Annexe E — Capacités serveur o2switch (à préserver/contraindre)

PHP web+cli 8.1.34 · MariaDB 11.4.12 · `exec()`/`shell_exec()` OK · cron cPanel OK (binaire `/usr/local/bin/php`) · **Python système 3.6.8 inutilisable → venv py311** · PyMuPDF/Pillow/LiteLLM OK · **Ghostscript présent**, **Tesseract/OCRmyPDF/Poppler/Pandoc ABSENTS** · pas de VPS, pas de GPU, processus background tués (→ **Ollama local abandonné**, IA 100 % cloud via LiteLLM) · modèle robuste = **file `server_jobs` + cron `run_jobs.php`** (jamais de traitement long dans la requête web).

## Annexe F — Décisions verrouillées

Toutes les décisions de cadrage sont **fermées** — voir **Phase 0** (D1–D11, portabilité PWA, abstraction conservée, hors-ligne aucun, lots jetables, **intégration directe au corpus** sans staging). Seul travail de **conception** restant (technique, assigné à l'IA) : le **schéma exact des zones corpus + auth** (Phase 3).
