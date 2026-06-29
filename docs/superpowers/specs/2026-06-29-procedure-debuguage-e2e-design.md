# Procédure de débuguage de Lumosphère — tests e2e full-stack en local

**Date** : 2026-06-29
**Statut** : design validé (chef de projet), spec à relire avant plan d'implémentation
**Objet** : recenser **tous les parcours et cas de figure** de l'application, puis les **tester automatiquement** de bout en bout (Playwright), sur une **copie jetable de Lumosphère exécutée en local**.

---

## 1. Intention (en clair)

« Débuguer Lumosphère » signifie ici : **passer toute l'appli au crible, automatiquement**, pour faire sortir les bugs avant qu'ils n'arrivent en ligne.

La procédure ne tape **jamais** sur le serveur de production. On monte une copie complète de l'appli sur la machine du chef de projet (front React + API PHP + base de données de test), Playwright la pilote comme un vrai utilisateur, et un rapport indique ce qui passe et ce qui casse.

**Approche retenue** : Option A — vraie appli en local (front + API + base de test), la seule qui teste à la fois l'affichage, le serveur **et** les droits, sans risque.

---

## 2. Contexte technique constaté

- **Outils locaux présents** : PHP 8.4, Node 22, pnpm, MariaDB (serveur **actif** en local), client `mysql`, Python 3.13, ruff, gitleaks, composer.
  - ⚠️ PHP local en **8.4**, serveur o2switch en **8.1.34** : les vérifs PHP locales restent indicatives sur les différences de version, mais le comportement applicatif testé est fidèle.
- **Schéma BDD** : migrations `db/migrations/003 → 013` (la `003` crée les 7 tables du corpus ; il n'existe pas de 001/002). Vérifs dans `db/verify/`, seeds dans `db/seeds/`.
  - En production, l'utilisateur applicatif n'a pas les droits DDL (création de tables via phpMyAdmin). **En local, le banc d'essai applique les migrations avec un compte privilégié** — cette contrainte de prod ne s'applique pas au montage de test.
- **API PHP** : sans framework, point d'entrée `api/router.php` (préfixe `/api/`, dispatch vers `api/endpoints/*.php`). Servable par le serveur intégré de PHP (`php -S`), sans Apache.
- **Front** : React 19 + Vite, routes dans `src/App.tsx` (voir matrice §5). Dev server Vite sur `:5173`.
- **e2e actuel** : `e2e/*.spec.ts` (smoke, auth, navigation, responsive, theme) tourne sur `localhost:5173` via `pnpm dev` **sans backend** → les vrais tests de connexion sont **automatiquement sautés** (`test.skip` faute d'identifiants/API). L'e2e actuel ne couvre donc que l'affichage.
- **Config** : `config/config.php.example` (tableau `$config[...]` : `db_host`, `db_name`, `db_user`, mot de passe, `allowed_origin` pour CORS, `python_bin`…). `config/config.php` n'est **jamais** versionné.
- **Journaux existants** : `journal_events` (niveau lot) et `server_jobs` (tâches de fond) — utiles comme points d'observation lors du diagnostic.

---

## 3. Partie 1 — Le banc d'essai local (à installer une fois)

But : **une seule commande** monte une copie complète et jetable de l'appli, prête à être testée.

### 3.1 Base de données de test

- Base dédiée **`lumosphere_test`** sur le MariaDB local, strictement séparée de toute autre base.
- Script de montage (`scripts/test-db-setup` — nom indicatif) qui :
  1. `DROP DATABASE IF EXISTS lumosphere_test; CREATE DATABASE … ` avec charset `utf8mb4` et collation `utf8mb4_unicode_520_ci` (repli `utf8mb4_unicode_ci` si indispo).
  2. applique **dans l'ordre** les migrations `003 → 013` (+ `db/config/mariadb_fulltext_config.sql` si nécessaire à l'init FULLTEXT) ;
  3. charge les **seeds** : référentiels (états, thèmes — déjà dans les migrations 006/007), un corpus de citations de test, des **œuvres** variées, et **un utilisateur par rôle** (Abo3, Abo4, Éditeur, Admin) avec mots de passe connus de test ;
  4. crée les **accès par œuvre** (`role_oeuvre_access`) de façon à pouvoir vérifier le filtrage Abo3/Abo4 (au moins une œuvre autorisée et une interdite par abonné) ;
  5. couvre les **états** : au moins une citation `Publiée`, une `À Corriger`, une `À Réviser`, et une **soft-deletée** (`deleted_at` non nul) pour vérifier le masquage.
- Les jeux de données de test vivent sous `db/seeds/` (réutiliser/compléter `setup_atelier_test.sql`, `seed_citations_test.sql`).

> Les mots de passe de test sont **fictifs** et propres à la base locale ; aucun secret de prod n'est utilisé ni versionné.

### 3.2 Config locale de test

- Un `config/config.php` local (non versionné) pointant vers `lumosphere_test`, `allowed_origin` = origine locale du front, `litellm_base_url` vide (IA non appelée — voir §6).
- Fourni via un modèle dédié committable `config/config.test.php.example` que le script copie/complète, pour que le montage soit reproductible sans exposer de secret.

### 3.3 Serveurs locaux

- **API** : `php -S 127.0.0.1:8080` avec un routeur d'entrée minimal qui inclut `api/bootstrap.php` + `api/router.php` (gère le préfixe `/api/`). Port à confirmer/configurer.
- **Front** : `pnpm dev` (`:5173`), configuré pour appeler l'API locale (variable d'environnement Vite type `VITE_API_BASE_URL=http://127.0.0.1:8080/api`). Vérifier que `apiClient.ts` lit bien cette base et envoie `credentials: 'include'`.
- **CORS** : `allowed_origin` local + `Access-Control-Allow-Credentials: true` pour que les cookies de session passent en local.

### 3.4 Remise à zéro (isolation des tests)

- **Avant la série** : `global setup` Playwright relance le montage base (état seedé connu).
- **Stratégie d'isolation** : les specs sont écrites pour être **indépendantes de l'ordre** ; les parcours qui **écrivent** (créer/supprimer) nettoient derrière eux ou opèrent sur des données dédiées. Re-seed par fichier si un parcours destructif l'impose.
- Pas de remise à zéro par test individuel en v1 (trop lent) ; on l'ajoutera ciblé si un parcours l'exige.

### 3.5 Authentification de test

- Un `storageState` Playwright **par rôle** (Visiteur = aucun ; Abo3 ; Abo4 ; Éditeur ; Admin), généré une fois par `global setup` via une vraie connexion à l'API locale, puis réutilisé par les specs (rapide, pas de relogin à chaque test).

**Livrable Partie 1** : `pnpm test:e2e` démarre base + API + front et lance les tests, en une commande, sans intervention manuelle.

---

## 4. Partie 2 — Le recensement des parcours (la carte)

Un document-checklist `docs/_contexte-ia/` ou `docs/` (à placer) listant **chaque parcours × chaque rôle × chaque cas**, avec une case par item (couvert / à couvrir / hors-scope). C'est la garantie de complétude.

Rôles : **Visiteur** (non connecté), **Abo3**, **Abo4**, **Éditeur**, **Admin**.

La carte sert de source de vérité pour la Partie 3 ; chaque test e2e référence l'item de carte qu'il couvre.

---

## 5. Matrice des parcours et cas (détail)

Routes constatées dans `src/App.tsx` : `/` (Accueil), `/login`, `/atelier`, `/atelier/lot/:id` (Éditeur+Admin), `/admin/*` (12 pages, Admin only), `*` (NotFound).

### 5.1 Parcours publics (Visiteur)
- Accueil s'affiche (titre, structure).
- Corpus / recherche : saisie avec **debounce 300 ms**, filtres (sidebar), badges de filtres retirables, pagination « charger plus » (keyset), virtualisation > 200 résultats.
- Accent-insensibilité de la recherche (« eveil » trouve « éveil »).
- Un Visiteur ne voit **que** les citations `Publiée` d'œuvres publiques ; jamais `À Corriger`/`À Réviser`/soft-deletées.
- Lecture d'une citation publiée.
- Page introuvable (`*` → NotFound).
- Accès direct `/atelier` et `/admin` → redirigé vers `/login`.

### 5.2 Connexion / sessions (auth)
- Formulaire complet (email, mot de passe, « se souvenir de moi », bouton).
- Connexion réussie (chaque rôle) → accueil + bouton Déconnexion.
- Connexion échouée (mauvais mot de passe) → message d'erreur clair, pas de fuite d'info.
- **Blocage après N échecs** (login_attempts) + verrouillage compte.
- « Se souvenir de moi » (session persistante 30 j) vs session 2 h.
- Déconnexion → lien Connexion réapparaît, session invalidée.
- CSRF : une mutation sans `X-CSRF-Token` est refusée.

### 5.3 Visibilité par rôle (cœur du débuguage — droits)
- **Abo3** : voit **uniquement** les œuvres explicitement autorisées ; une œuvre non autorisée est **absente** (filtré en SQL, pas masqué à l'écran).
- **Abo4** : idem avec son propre périmètre.
- **Éditeur/Admin** : voient **tous les états** de **toutes les œuvres**.
- Soft-delete : `deleted_at` masqué partout pour tous, sauf bascule Admin « voir supprimés ».
- Vérifier qu'aucun appel API ne renvoie de données hors-périmètre (test côté résultats, pas seulement côté affichage).

### 5.4 Atelier (Éditeur / Admin)
- Liste des lots ; ouverture d'un lot (`/atelier/lot/:id`).
- États d'un lot et journal (`journal_events`).
- **Intégration au corpus** : lot conforme (thème + date + auteur + mots-clés) → écriture **transactionnelle tout-ou-rien** ; état par défaut `À Corriger`.
- Lot **non conforme** → intégration refusée avec motif.
- Dédup avant écriture (`hash(content + telegram_message_id)`).
- **Intégration ≠ Publication** : passage à `Publiée` = acte humain séparé.
- (Collecte manuelle : création d'une source / d'un lot à la main.)

### 5.5 Admin — 12 pages (CRUD + règles)
Pour chacune : affichage de la liste, création, modification, suppression, validation des erreurs serveur.
- **utilisateurs** : créer/éditer, jamais renvoyer `password_hash` ; rôle Admin non supprimable/non réductible.
- **roles** (accès) : associer œuvres aux rôles (`role_oeuvre_access`).
- **auteurs**, **oeuvres**, **sources**.
- **themes** : max 2 niveaux (parent → enfant), chemin calculé en PHP.
- **mots-cles** : normalisation (unicité insensible à la casse) ; mots-clés suggérés par IA exigent **validation humaine**.
- **etats** : états système (`À Corriger`/`À Réviser`/`Publiée`) **non supprimables**.
- **emojis**, **citations** (admin), **ia** (config LiteLLM — voir §6), **parametres** (mode debug global, rétention journal).

### 5.6 Transverse
- Navigation au clavier, labels ARIA, contraste WCAG AA (accessibilité, cf. `testing.md`).
- Responsive : desktop / tablette / mobile.
- Thème (clair/sombre) — déjà partiellement couvert (`theme.spec.ts`).

---

## 6. Partie 3 — Couverture progressive, par zones

Les specs e2e suivent la carte, **zone par zone**, chacune avec son rôle et ses données :
1. Public / corpus / recherche (Visiteur).
2. Connexion / sessions / CSRF.
3. Visibilité par rôle (Abo3/Abo4 vs Éditeur/Admin) — **priorité débuguage**.
4. Atelier (intégration, états, journal).
5. Admin CRUD (12 pages) + règles protégées.
6. Transverse (accessibilité, responsive).

Avantage : paliers validables un par un, pas un bloc monolithique.

### Limites assumées (hors-scope v1, **explicitement marquées dans la carte**)
- **Services externes non appelés pour de vrai** : IA (**LiteLLM**), **Telegram**, transcription **YouTube**, **OCR**. On teste tout *autour* (déclenchement, écriture `server_jobs`, états, journaux) en **simulant** la réponse externe ; on ne valide pas la qualité du contenu produit par l'IA.
- **Workers Python & cron** : la chaîne complète (exec → worker → JSON → MAJ `server_jobs`) n'est pas rejouée en e2e v1 ; couverte séparément par tests unitaires de worker (ruff + petit fichier) selon `python-workers.md`. Un test e2e peut vérifier qu'une demande crée bien un `server_jobs` en attente.
- **Garde anti-résumé** (texte nettoyé ≥ 80 % du brut) : vérifiée au niveau worker, pas en e2e.
- **Pas de tests sur le serveur en ligne** dans ce périmètre (Option A pure).

---

## 7. Partie 4 — Lancement (automatisé au maximum)

- `pnpm test:e2e` → montage base + démarrage API + front + exécution des tests, en une commande.
- `pnpm test:e2e --ui` → mode visuel pour **rejouer** un parcours qui échoue et voir où ça casse.
- **Rapport HTML automatique** (`playwright-report/`) avec captures + traces (`trace: on-first-retry` déjà configuré) à chaque échec.
- Vérifs statiques **inchangées et séparées** (déjà en place) : `pnpm lint`, `pnpm build`/`tsc`, `pnpm test` (Vitest), `php -l`, PHPStan, PHPCS, `ruff`, `gitleaks` — rappelées dans `testing.md`.
- Mise à jour de `playwright.config.ts` : `webServer` orchestrant **front + API** (au lieu du seul `pnpm dev`), `global setup` (base + storageState par rôle), exécution **en série** par défaut en local (`workers: 1`) pour éviter les e2e instables sans état partagé (cf. mémoire projet), parallèle réservé au CI une fois stable.

---

## 8. Architecture (vue d'ensemble)

```
pnpm test:e2e
   │
   ├─ global setup
   │    ├─ scripts/test-db-setup  → DROP+CREATE lumosphere_test, migrations 003→013, seeds (rôles, œuvres, états, soft-delete)
   │    └─ login API local        → storageState par rôle (Abo3, Abo4, Éditeur, Admin)
   │
   ├─ webServer
   │    ├─ php -S 127.0.0.1:8080 (api/ via router)   ← config.php → lumosphere_test
   │    └─ pnpm dev (:5173)                          ← VITE_API_BASE_URL → :8080/api
   │
   └─ Playwright (chromium) joue les specs par zone
        → rapport HTML + traces sur échec
```

Chaque brique a une responsabilité unique : montage données (script SQL), service API (PHP), service front (Vite), pilotage (Playwright), carte (doc checklist). Une brique se change sans casser les autres.

---

## 9. Critères de succès

1. `pnpm test:e2e` monte et teste l'appli complète en local, **en une commande**, sans étape manuelle.
2. La **carte** (§4/§5) couvre tous les parcours et cas ; chaque item est `couvert`, `à couvrir` ou `hors-scope` (justifié).
3. Les **règles de droits** (Abo3/Abo4, états, soft-delete) sont vérifiées **sur les résultats d'API**, pas seulement à l'écran.
4. Un échec produit un **rapport visuel exploitable** (capture + trace) sans relancer.
5. Aucun secret versionné ; `gitleaks` passe ; la base de prod n'est jamais touchée.
6. Les limites (IA/Telegram/YouTube/workers) sont **explicites** dans la carte, jamais silencieuses.

---

## 10. Points ouverts à confirmer pendant l'implémentation

- Port de l'API locale (8080 proposé, à aligner avec d'éventuelles attentes du front / mémoire projet « :8080 »).
- Comment `apiClient.ts` détermine l'URL de base (variable Vite à introduire si absente).
- Présence éventuelle d'un compte MariaDB local privilégié pour le DDL (sinon, en créer un dédié au test).
- Granularité de remise à zéro (par série vs par fichier) selon les parcours destructifs réellement écrits.
- Faut-il un mock HTTP local pour LiteLLM (réponses IA simulées) dès la v1, ou suffit-il de désactiver l'IA.
```

