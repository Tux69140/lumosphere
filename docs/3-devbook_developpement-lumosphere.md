# Devbook de développement — Lumosphère

> **Version 1.2.** Construit **Lumosphère** : la **bibliothèque / UI documentaire** complète **et** l'intégration de **toutes les chaînes de préparation** vers le corpus.
> **Prend le relais** du `4-devbook_migration_full_web-lumosphere.md` (qui rend l'atelier Epuriel full-web et pose le socle base/auth/serveur). Jonctions : **schéma corpus + auth** (migration Phase 3) et **intégration directe atelier→corpus** (migration Phase 6.3).
> **Stack imposée** : React/Vite + PHP + **MySQL** + PWA. Transposition des deux anciennes trames (Index SvelteKit/SQLite/Electron **et** Epuriel) → vocabulaire et composants adaptés. **Plus de pivot ni de staging** : validation d'un lot conforme → écriture **directe** au corpus, en transaction ; **intégration ≠ publication**.

> **Convention de numérotation** (extensible, sans « bis ») :
> - **Phases** = chiffres **romains** : `I … VII` (distinct du cahier « Phase 1/2/3 » et du devbook de migration « Phase 0–9 »).
> - **Tâches** = chiffres **arabes** : `III.4`.
> - **Sous-tâches** = **lettres** minuscules : `III.4.a`.
> - **Items** = cases à cocher (non numérotées) — on en ajoute librement sans renuméroter.
> - Légende : `- [x]` réalisé/validé · `- [ ]` à faire. **Rien n'est coché sans validation du chef de projet.**

---

## 0. Lecture rapide

- **But** : passer d'« un atelier full-web + une base » à **l'application éditoriale complète** : consulter, chercher, éditer, administrer, et **alimenter le corpus** depuis Telegram / PDF / YouTube / HTML.
- **Stratégie UI-first** : dès que le schéma corpus existe et qu'on a des **données de test**, construire une **base UI visualisable** (Phase II) pour **voir les résultats** et valider le bout-en-bout avant les chaînes lourdes.
- **Ordre conseillé** : **I** socle (composants + schéma validés) → **II** socle UI visualisable → **III** bibliothèque complète → **IV** chaînes de préparation → **V** modules → **VI** exports.
- **Transverse** : règles métier et droits **côté serveur (PHP/DAL)** ; l'UI passe par les services applicatifs (couche d'abstraction conservée) ; traitements longs via `server_jobs` + cron.

---

## Phase I — Socle : composants, schéma corpus et DAL (refonte de la Phase 0 Index)

But : **s'assurer que les bons composants sont présents** et **figer/valider le schéma corpus** avant de coder. Transpose la Phase 0 de la trame Index sur la stack imposée.

### I.1 — Direction figée (rappel de cadrage)
- [x] Reconstruction sur **React/Vite + PHP + MySQL + PWA** ; Markdown = source éditoriale ; **LiteLLM** ; **intégration directe au corpus** (plus de pipeline séparé ni de pivot). *(Acté en Phase 1 documentation.)*

### I.2 — Vérifier la présence des bons composants (avant toute (ré)installation)
- [x] **Contrôler ce qui est déjà présent** dans le dépôt avant d'installer (éviter les doublons / restes inutiles : ex-Electron côté front, paquets Tauri/Rust).
- [x] **Front** : React 19, Vite, **TypeScript**, **Tailwind** (charte §28 + clair/sombre), composants headless (**Radix UI** retenu, sans shadcn), **TanStack Table**, **Phosphor Icons**, **Zod** (validation), pnpm, ESLint/Prettier, **Vitest + Playwright**. Complété par **cmdk** (combobox), **react-day-picker** (dates), **Sonner** (notifications toast).
- [x] **API** : PHP 8.1, **PDO MySQL** (paramètres liés), pas de framework lourd ; outillage PHPStan/PHPCS, Gitleaks.
- [x] **Workers** : venv **py311** (PyMuPDF/Pillow/LiteLLM OK) ; OCR (Tesseract/OCRmyPDF/Poppler) et Pandoc **à installer** (cf. migration Phase 4).
- [x] **Livrable** : note « composants présents / à installer » validée (`docs/note_composants-I2.md`).

### I.3 — Étude et validation du schéma corpus + auth (ex-T0.4) ⚠️ à valider
- [ ] **Étudier et valider** les tables **corpus** : `citations`, `auteurs`, `oeuvres`, `themes` (≤ 2 niveaux, chemin calculé PHP), `keywords`, `citation_keywords`, `etats` (C/R/P), `mediatheque`, `bibliotheque`, `notifications`, `config`, `emojis`, `telegram_channels`, `import_sources` (sans `import_runs`), `export_jobs`, `schema_version`, `user_favorites`, `local_favorites`.
- [ ] **Étudier et valider** les tables **auth** : `users` (bcrypt), `roles` (Administrateur protégé, Éditeur, Visiteur, Abo3, Abo4), `permissions`, `role_permissions`, `role_oeuvre_access`, `active_sessions`.
- [ ] **Adaptation SQLite→MySQL** (source : schémas Index `docs/_reference/index-corpus-schema/`, Annexe C du devbook de migration) : AUTO_INCREMENT, types, `TINYINT(1)`, `ON UPDATE CURRENT_TIMESTAMP`, ENUM/CHECK, `FULLTEXT` (remplace FTS5), collation **accent-insensible**.
- [ ] **Soumettre les choix structurants au chef de projet** ; puis **migration initiale + seed** (rôles, états, administrateur initial à changer, thèmes/sous-thèmes).
- [ ] **Livrable** : schéma corpus+auth validé + script de migration + seed.

#### Complément I.3 — Matrice RBAC (droits par rôle × état × action)

| Action | Visiteur | Abo3 | Abo4 | Éditeur | Admin |
|--------|----------|------|------|---------|-------|
| **Voir citations `Publiée`** | ✓ (œuvres publiques) | ✓ (ses œuvres) | ✓ (ses œuvres) | ✓ (toutes) | ✓ (toutes) |
| **Voir citations `À Réviser`** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **Voir citations `À Corriger`** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **Recherche fulltext** | ✓ (filtré rôle) | ✓ (filtré œuvres) | ✓ (filtré œuvres) | ✓ | ✓ |
| **Favoris** | ✓ (local browser) | ✓ (local) | ✓ (local) | ✓ (liés compte) | ✓ |
| **Éditer citation** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **Changer état → Publiée** | ✗ | ✗ | ✗ | ✓ (validation humaine) | ✓ |
| **Supprimer (soft-delete)** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **Voir soft-deleted** | ✗ | ✗ | ✗ | ✗ | ✓ |
| **CRUD référentiels** | ✗ | ✗ | ✗ | ✓ (limité) | ✓ |
| **Gérer utilisateurs/rôles** | ✗ | ✗ | ✗ | ✗ | ✓ |
| **Atelier (lots)** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **Config système** | ✗ | ✗ | ✗ | ✗ | ✓ |

**Règles de filtrage DAL** :
- `role_oeuvre_access` filtre Abo3/Abo4 : seules les œuvres explicitement accordées sont visibles
- Visiteur sans compte : ne voit que les citations `Publiée` des œuvres marquées publiques
- Éditeur voit tous les états de toutes les œuvres
- Le filtre s'applique **dans la requête SQL** (WHERE), jamais en post-fetch côté PHP

### I.4 — Définir la DAL (couche d'accès données, ex-T0.5)
- [x] **Module unique** d'accès MySQL en **PDO paramètres liés** ; **aucun SQL côté front**. *(DAL complétée : 11 fichiers `api/dal/`, point d'entrée `api/bootstrap.php` + routeur + endpoints.)*
- [x] **Règles métier centralisées** : état défaut `À Corriger` ; `Publiée` interdit sans jeu complet **ni validation humaine** (mots-clés IA) ; états système non supprimables ; thèmes ≤ 2 niveaux ; mots-clés normalisés (unicité insensible casse) ; **suppression douce filtrée** ; **droits par œuvre sur TOUTES les lectures** ; verrous `SELECT … FOR UPDATE` ; **pagination keyset**. *(Toutes ces règles implémentées et testées dans `tests/dal/`.)*
- [x] **Recherche** : extraction du texte depuis Markdown pour `FULLTEXT` + `auteur_nom` dénormalisé maintenu à l'écriture. *(Recherche fulltext avec `IN BOOLEAN MODE`, filtres combinés, modes OR/AND mots-clés.)*
- [x] Appel via **contrats stables** (services applicatifs), pas depuis les composants — prépare les adaptateurs (Web aujourd'hui ; Tauri plus tard). *(`src/services/api.ts` — point unique de communication, remplaçable pour bureau/mobile.)*

### I.5 — Spécifier l'éditeur Markdown riche (ex-T0.6)
- [ ] Trancher l'**architecture de l'éditeur** avant de l'implémenter : Markdown enrichi comme source, rendu visuel confortable, toolbar non technique, tableaux/images/liens/notes/emojis, bascule source optionnelle.
- [ ] **Livrable** : note technique de choix de bibliothèque + **prototype court**.

#### Complément I.5 — Critères de sélection éditeur Markdown

**Contraintes** :
- Source = Markdown (pas HTML propriétaire) → export/import portable
- Rendu WYSIWYG (pas CodeMirror brut) pour un utilisateur non-technique
- Tableaux éditables visuellement (drag, add/remove rows)
- Images via médiathèque interne (upload → URL serveur, pas de DataURI)
- Compatible React 19 + TypeScript
- Licence MIT/Apache (pas de licence virale)

**Candidats à évaluer** :
| Librairie | Type | Markdown natif | Tables visuelles | Maturité |
|-----------|------|----------------|-----------------|----------|
| **TipTap** (ProseMirror) | WYSIWYG | Via extension `markdown` | ✓ | Élevée |
| **Milkdown** (ProseMirror) | WYSIWYG/hybride | Natif | ✓ | Moyenne |
| **MDXEditor** | WYSIWYG | Natif | ✓ | Moyenne |
| **BlockNote** (ProseMirror) | Blocs | Via sérialisation | ✓ | Récente |

**Critère décisif** : la librairie doit sérialiser/désérialiser du Markdown standard (CommonMark + tables GFM) sans perte. Tester : bold, italic, headings, listes, blockquotes, tables, liens, images, notes de bas de page.

### I.6 — Spécifier le mapping atelier → corpus (remplace l'ex-T0.7 hybride)
- [ ] **Contrat de mapping** : modèle ex-pivot 3.4 (`document`/`source`/`segments`/`indexation`/`media`) → `citations`/`segments`/`keywords`/`citation_keywords`/`mediatheque`.
- [ ] **Garde de conformité** (avant intégration) : jeu complet (thème+date+auteur+mots-clés) ; **stratégie de hash** de dédup (contenu + `telegram_message_id`).
- [ ] **RAG/embeddings** : feuille de route **non bloquante** pour la v1 (couche séparée, plus tard).

### I.7 — Données de test + squelette React
- [ ] **Jeu de citations de test** dans le corpus (convertir les données de test déjà en base atelier, ou seed dédié) → matière à **afficher** dès la Phase II.
- [ ] Squelette React : layout, routage, **thème clair/sombre**, charte + Phosphor ; services (`EpurielServices`, adaptateur Web `fetch`/`credentials:'include'`).
- [ ] **Nettoyage post-migration** (une fois les données de test reversées au corpus et le bout-en-bout validé) : supprimer l'**ancienne base `mist2786_epuriel`** (filet de sécurité conservé pendant la bascule Phase 2, cf. migration §2.6 / §9.5) et purger les **anciens lots** de l'atelier (dossiers `lots/` devenus inutiles ; les lots sont jetables, cf. migration Phase 3bis). ⚠️ Action **destructive et irréversible** : seulement après validation explicite du chef de projet.

#### Complément I.7 — Build React & déploiement o2switch

**Build** :
```bash
pnpm run build          # → dist/ (HTML + JS + CSS statiques)
```

**Déploiement** (depuis la machine de dev) :
```bash
rsync -avz --delete dist/ lumosphere:/home2/mist2786/public_html/
```

**Structure serveur après déploiement** :
```
/home2/mist2786/public_html/
├── index.html          ← SPA entry point
├── assets/             ← JS/CSS chunks (Vite)
├── manifest.json       ← PWA manifest
├── sw.js               ← Service worker
├── api/                ← PHP API (epuriel.php, bootstrap.php, etc.)
└── config/             ← config.php (hors dépôt, secrets)
```

**Routing SPA** : configurer `.htaccess` pour rediriger toutes les routes non-fichier vers `index.html` :
```apache
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

---

## Phase II — Socle UI visualisable (vertical slice) ⭐

But : **voir les résultats** le plus tôt possible et valider schéma + droits + rendu de bout en bout.

- [ ] **Connexion** (login/logout, session, redirection) — auth serveur (migration 6.2).
- [ ] **Vue bibliothèque en lecture** : liste/**cartes d'entrées** depuis le corpus de test (thème/sous-thème, œuvre, auteur, **contenu rendu depuis Markdown**, notes, mots-clés).
- [ ] **Recherche/filtres minimaux** : plein texte + thème/œuvre/auteur (pour éprouver `FULLTEXT` + droits).
- [ ] **Droits par rôle/œuvre** appliqués dès cette vue.
- [ ] **Critère de sortie** : un éditeur se connecte, voit/filtre les entrées de test, l'autrice **commente le rendu réel**.

---

## Phase III — Bibliothèque complète (cœur éditorial — cahier Phase 1)

### III.1 — Rôles et droits
- [ ] Rôles Visiteur / Abo3 / Abo4 / Éditeur / Administrateur ; **Administrateur protégé**.
- [ ] Gestion des rôles ; **accès aux œuvres par rôle** (`role_oeuvre_access`) appliqué **dans la DAL** sur toutes les lectures.
- [ ] **Écran admin de gestion des utilisateurs** :
  - Bouton « + Ajouter un utilisateur ».
  - Tableau : nom d'utilisateur, email, rôle, actions éditer / supprimer (suppression avec confirmation).
  - Modale de création / édition : nom, email, rôle (dropdown), mot de passe, confirmation mot de passe.
  - Champs mot de passe vidés après enregistrement (confidentialité).
- [ ] Fonction de changement de passe / mot de passe oublié.

### III.2 — Référentiels éditoriaux (CRUD admin)
- [ ] Auteurs · œuvres (abréviation, auteur, URL, réf libraire, accès Abo3/Abo4) · **thèmes ≤ 2 niveaux** · mots-clés (normalisés, saisie qui propose l'existant) · états · emojis.

### III.3 — Consultation publique complète
- [ ] Bandeau supérieur collant (logo/titre, favoris, bibliothèque, contact, aide **contextuelle** (modale dont le contenu varie par page/section — clé par route), thème clair/sombre, configuration des rôles autorisés, connexion).
- [ ] **Panneau de filtres** (œuvres, auteurs, thèmes/sous-thèmes, mots-clés OU/ET + filtre alphabétique, dates, plein texte, réinitialisation), repliable sur mobile.
- [ ] **Zone de résultats** : compteur, critères actifs en **badges supprimables**, cartes, `Fin des résultats.`
- [ ] **Favoris** web (local navigateur) + favoris reliés.
- [ ] Fonction "Retour à la page d'où l'on venait » après connexion, reliquat de T09.

### III.4 — Moteur de recherche : étude puis codage (ex-T1.6)
- [ ] **Étude** : conception de la recherche combinée et de ses index ; comportement OU/ET sur mots-clés ; tri/pertinence ; stratégie accent-insensible.
- [ ] **Codage** : **FULLTEXT** (insensible casse/accents) + auteur + œuvre + thème + mots-clés (OU/ET) + dates + état (admin) + droits par rôle.
- [ ] **Performances** : **pagination keyset**, **debounce 300 ms**, **virtualisation > 200**, index dédiés ; validés sur **1 000 / 10 000 / 50 000** entrées.

#### Complément III.4 — Configuration FULLTEXT MySQL

**Mode retenu** : `IN BOOLEAN MODE` (permet opérateurs `+`, `-`, `*`, guillemets pour phrases exactes). Plus prévisible que `NATURAL LANGUAGE MODE` pour une recherche éditoriale.

**Configuration MariaDB 11.4** (à vérifier/adapter via phpMyAdmin ou `SET GLOBAL`) :
- `innodb_ft_min_token_size = 2` (défaut 3 ; permet de trouver "IA", "âme", etc.)
- `innodb_ft_enable_stopword = OFF` **ou** stopword list personnalisée française (le défaut est anglais et filtre "a", "de", "le" etc. qui sont aussi des mots français pertinents dans un contexte éditorial)
- Collation des colonnes FULLTEXT : `utf8mb4_unicode_520_ci` (déjà appliquée en Phase 3.2)

**Comportement recherche combinée** :
- Fulltext = recherche principale (champ texte)
- Filtres auteur/œuvre/thème/mots-clés = WHERE additionnels (index B-tree classiques)
- Mots-clés OU/ET : toggle UI → `OR` = `IN (list)`, `AND` = `HAVING COUNT = nb_keywords`
- Tri par défaut : `created_at DESC` (plus récent d'abord) ; option pertinence FULLTEXT (`MATCH score`)

**Pagination keyset** :
- Curseur = `(sort_value, id)` encodé en base64 opaque
- Direction : forward only en v1 (simplification ; "retour" = reset filtres)
- Page size : 50 (configurable)

**Stemming** : non disponible nativement en français sur MariaDB. Accepter la recherche par forme exacte. Alternative future : table de synonymes/lemmes alimentée par LiteLLM.

### III.5 — Éditeur Markdown riche (implémentation de I.5)
- [ ] Éditeur visuel (type Typora) : Markdown source, bascule source possible.
- [ ] Toolbar : gras/italique, titres H1–H4, listes, citation, liens, **images (médiathèque)**, **tableaux éditables sans Markdown**, notes, emojis, annuler/rétablir, reset.
- [ ] Sauvegarde fiable (POST serveur sous session, **verrou d'édition**) ; régénération `FULLTEXT` à l'écriture.

### III.6 — Gestion des entrées (admin/éditeur)
- [ ] Tableau : recherche, filtres mémorisés, tri, **sélection multiple**, aperçu, auteur/œuvre/thème/état.
- [ ] **Actions groupées** : changer œuvre/état/thème/mots-clés (Ajouter/Remplacer/Supprimer) ; suppression (double confirmation, **suppression douce**) ; **édition rapide**.

### III.7 — IA LiteLLM (assistance éditoriale)
- [ ] Configuration providers (allowlist, modèle défaut, prompts modifiables, test de connexion, journalisation coût/latence).
- [ ] Suggestions **mots-clés** et **thème/sous-thème** ; **validation humaine obligatoire avant application**.

### III.8 — Tests Phase III
- [ ] Typecheck + lint ; tests unitaires DAL ; **tests droits Abo3/Abo4** ; perfs recherche/filtres (1k/10k/50k) ; **non-publication sans validation humaine** ; accessibilité (clavier, contrastes, labels).

---

## Phase IV — Chaînes de préparation → corpus (absorbe Epuriel E→H)

Construit les chaînes **une à une**. Chaque chaîne finit par : validation d'un lot conforme → **intégration directe au corpus** (transaction) → suppression du lot. Tout traitement long via `server_jobs` + cron.

### IV.1 — Pont validation → corpus
- [ ] Brancher la **validation du lot** sur l'écriture corpus en transaction (cf. migration 6.3) : conformité (jeu complet, doublons), mapping I.6, état `À Corriger`, suppression du lot après écriture vérifiée.
- [ ] **Visualisation** : l'entrée intégrée **apparaît dans la bibliothèque** (boucle de feedback Phases II/III).

### IV.2 — Chaîne Telegram complète (bot `@Actualis_bot`) — cahier Phase 1
- [ ] Collecte par bot, agrégation par période, **fenêtre de révision** (sélectionner/grouper/prévisualiser), enrichissement IA **avant** révision, travail éditorial manuel, enrichissement IA **synonymes** après révision, **règle Telegram** (thèmes + mots-clés requis) → intégration corpus. Dédoublonnage `telegram_message_id` + marqueur de collecte.
- [ ] **Tests** : collecte/agrégation sur lot de démonstration, révision, intégration, dédoublonnage.

### IV.3 — Extraction des composants communs (Epuriel E.6)
Après le **premier Telegram de bout en bout**, isoler les composants réutilisables (ne pas les laisser enfermés dans Telegram) :
- [ ] `ListeLots` (liste, filtres simples, statut, source, responsable) · `DetailLot` (résumé, étape, fichiers, actions) · `JournalLot` (événements, dates, acteur, message).
- [ ] `ExplorateurFichiersLot` (`0_raw/`, étapes) · `EditeurMarkdownRevision` (correction humaine) · `ApercuContenuPrepare` (lecture formatée du contenu du lot) · `SuggestionsIA` (thèmes/mots-clés, **sans validation auto**) · `BlocErreurReprise`.
- [ ] **Règle** : tout composant utile à PDF/YouTube/HTML ne reste pas codé spécifiquement Telegram.
- [ ] **Tests** : rendu/service `ListeLots`/`DetailLot`/`JournalLot` ; explorateur de fichiers ; aperçu du contenu préparé ; **non-régression e2e** du parcours lot validé.

### IV.4 — Poste de pilotage atelier (Epuriel E.7)
Après un vrai cas traité, renforcer la gestion globale (faire d'Epuriel un **poste de pilotage**, pas une addition de scripts) :
- [ ] Filtres par **source** (Telegram/PDF/YouTube/HTML) et par **statut** (en attente, pris en charge, en traitement, à réviser, à reprendre, en pause, prêt, intégré, erreur).
- [ ] Lots **assignés à l'éditeur courant** ; prise en charge ; libération/changement de responsable ; **relance d'une étape échouée** ; consultation des résultats ; **repérage des lots prêts à intégrer** ; erreurs bloquantes/non bloquantes ; **homogénéisation des libellés de statut** (interface ↔ MySQL ↔ journal).
- [ ] **Tests** : filtres source/statut ; lots assignés ; relance/affichage d'erreur ; e2e du tableau de bord.

### IV.5 — Chaîne PDF (Epuriel F) — cahier Phase 1/2
- [ ] **OCR** complet (Tesseract/OCRmyPDF/Poppler **à installer** en venv), **segmentation PDF robuste**, **formatage Markdown avancé** (s'appuyer sur `apps/pdfmd` en référence, sans en faire l'app principale) → intégration corpus.
- [ ] **Tests** : worker petit PDF texte ; petit PDF OCR (si l'environnement le permet) ; segmentation ; intégration minimale conforme ; non-régression formatage `apps/pdfmd`.

### IV.6 — Chaîne YouTube (Epuriel G) — cahier Phase 2
- [ ] `yt-dlp` + `youtube-transcript-api`, **2 passes Map/Clean via LiteLLM**, **garde-fou anti-résumé** (> 20 %), **chapitrage/timecodes** → intégration corpus (cf. `conventions_traitement-lumosphere.md`).
- [ ] **Tests** : collecte/import vidéo démo ; normalisation métadonnées ; chapitrage sur transcription courte ; intégration minimale ; e2e ouverture lot YouTube.

### IV.7 — Chaîne HTML / texte collé (Epuriel H) — cahier Phase 2
- [ ] Extraction depuis URL déclarées + **conversion HTML→Markdown** + saisie directe, nettoyage, segmentation → intégration corpus.
- [ ] **Tests** : extraction page HTML démo ; nettoyage/conversion ; texte collé simple ; intégration minimale ; e2e ouverture lot HTML/texte.

### IV.8 — Nettoyage volontaire de l'historique (Epuriel E.8 — admin)
- [ ] Purge des updates Telegram déjà rattachées (après délai de sécurité) ; suppression volontaire d'un lot historique + dossier serveur ; suppression **cohérente** des lignes MySQL liées (documents, jobs, journaux).
- [ ] **Refus par défaut** des lots actifs/en révision/à reprendre/en erreur/non intégrés ; **aperçu avant suppression** (fichiers, taille, lignes MySQL) ; **confirmation explicite** ; **journalisation**. Jamais automatisé silencieusement.

---

## Phase V — Modules complémentaires (cahier Phase 2)

- [ ] **Médiathèque** : import JPG/PNG/GIF/WebP/SVG, miniatures, limite 2 Mo (configurable), texte alternatif, édition/suppression confirmée.
- [ ] **Bibliothèque de documents** : PDF/EPUB (titre, description, type, date, visibilité par rôle), consultation/téléchargement visiteur autorisé.
- [ ] **Notifications visiteurs** : formulaire de contact avec **catégorie** (« Question sur le contenu » → éditeur, « Autre » → admin) ; honeypot + CSRF ; **accusé de réception email** au visiteur ; **email de notification** au destinataire routé (+ copie admin si éditeur) ; tableau admin avec catégorie et destinataire routé ; notes internes.
- [ ] **Notifications internes par email** :
  - **PHPMailer** + SMTP authentifié o2switch ; config dans `config/config.php` (hors dépôt).
  - **Erreur de traitement** (job échoué) → email immédiat à l'admin + éditeur assigné au lot.
  - **Lot(s) prêt(s) à valider** → email digest à l'éditeur assigné ; **fréquence en nombre de jours** (0 = désactivé, 1 = quotidien, 7 = hebdo, 14 = bimensuel…), réglable par utilisateur dans ses préférences.
  - Table `notification_preferences` : `user_id`, `event_type`, `frequence_jours` (SMALLINT, défaut 1), `dernier_envoi_at` (date du dernier digest envoyé).
  - Extension table `notifications` : colonnes `categorie` (contenu/autre), `type` (contact/erreur_job/lot_pret), `destinataire_id` (FK→users), `email_envoye_at`.
  - Cron digest : agrège les lots prêts depuis `dernier_envoi_at`, envoie le récapitulatif, met à jour `dernier_envoi_at`.
  - Templates email simples (HTML inline, pas de moteur de templates).
- [ ] **CGU / Mentions légales (RGPD)** : page accessible depuis le pied de page. Doit mentionner : (1) le suivi des sessions de connexion (IP, navigateur) conservé 90 jours à des fins de sécurité ; (2) l'enregistrement temporaire de l'email en cas de tentatives de connexion échouées (purgé après 30 min). Base légale : intérêt légitime (sécurité du compte). *(Exigence issue de T07, détaillée dans le cahier des charges §31.)*
- [ ] **Import Telegram manuel** : config chiffrée, gestion des canaux, lien canal→œuvre, récupération par dates, révision, **import transactionnel**, dédoublonnage.
  - **Étape 1 — Config identifiants** : champs API ID / API Hash / Session String avec textes gris d'indication (« Obtenu depuis my.telegram.org. Jamais affiché après enregistrement. ») ; badge statut vert « Ok » ou rouge « Configuration à enregistrer » ; bouton d'aide ouvrant une modale avec la procédure d'installation Telethon (onglets Windows / Debian).
  - **Étape 2 — Gérer les canaux** : liste des canaux sauvegardés (modifier / supprimer) ; ajout avec Channel ID + auteur par défaut associé ; bouton d'aide avec procédure de récupération du Channel ID (privé ou public).
  - **Étape 3 — Lancer un import** : dropdown canal (depuis les canaux configurés), dates début / fin, bouton « Récupérer les messages ».
  - **Fenêtre de révision** : sélection / désélection (boutons tout sélectionner / tout désélectionner), groupement avec le message précédent (indication visuelle : indentation + bordure gauche mauve), bouton « Importer les N entrées ».
- [ ] **Sauvegardes / restauration** : dump base + médias + bibliothèque, restauration contrôlée, remise à zéro (double confirmation).
- [ ] **Emballage magasins** via PWABuilder (MSIX ; TWA + `assetlinks.json`) ; **responsive** desktop/tablette/mobile finalisé.

---

## Phase VI — Exports (cahier Phase 3)

- [ ] **Document Builder** : structure commune depuis le **snapshot affiché** (filtres, rôle, droits, ordre) — *ce qui est affiché est ce qui est exporté*.
- [ ] **PDF Typst** : titre, intro optionnelle, sommaire, contenu, images, notes, index, charte.
- [ ] **EPUB Pandoc** (binaire **à installer/embarquer**) : navigation, chapitres, images, notes, métadonnées.
- [ ] **Configuration d'export** : éditeur Markdown pour l'intro + variables `{{works}}`, `{{themes}}`, `{{keywords}}`, `{{searchTerm}}`, `{{count}}`, `{{date}}`.
- [ ] **Publication** d'un PDF/EPUB dans la bibliothèque pour les rôles autorisés.

#### Structure du document exporté (PDF et EPUB)

- **Page de titre** : logo Lulumineuse (1/4 hauteur), nom de l'application en grand (orange), critères de filtre actifs, copyright + date d'export en bas.
- **Pages de présentation** : générées depuis la configuration d'export (si texte renseigné) ; sinon omises.
- **Sommaire** : structure 2 niveaux (thèmes/sous-thèmes exportés), titres en orange.
- **Corps du document** :
  - Chapitres 2 niveaux (thème > sous-thème) en orange.
  - Titres d'entrées en violet-mauve.
  - **Numérotation des versets** : chaque paragraphe démarre par un numéro gris ; le 1er paragraphe de chaque entrée porte un **numéro d'entrée orange entre crochets `[n]`**.
  - **Séparateur** : icône soleil (☀) entre chaque entrée.
  - Liens hypertexte affichés en clair dans le texte.
  - Notes de bas de page.
  - Mots-clés en gris discret.
- **Index lexical** : tous les mots-clés des entrées exportées ; **lettrines oranges** avant chaque changement de lettre (A, D…) ; format `Mot-clé : page-numéro_entrée` ; **cliquable** vers le crochet `[n]` correspondant.
- **Pagination** : chiffres **romains** pour les pages liminaires (titre, présentation, sommaire) ; chiffres **arabes** pour le corps et l'index.
- **En-têtes** : gauche = nom du site, droite = thème (> sous-thème si applicable), ligne séparatrice en dessous ; police réduite.
- **Pieds de page** : numéro de page centré, police réduite.

---

## Phase VII — Évolutions (hors périmètre initial)

- [ ] Recherche **sémantique / RAG** (embeddings) : couche séparée.
- [ ] Outil **mobile d'édition** pour 2-3 éditeurs (tiers séparé, même API).
- [ ] Emballage **natif Tauri** (desktop, magasin Apple) via la couche d'abstraction, **sans réécrire l'UI**.

---

## Tests transverses (à chaque phase)

Règle métier / transformation → test unitaire ; parcours important → e2e (Playwright) ; endpoint → test API sur lot de démonstration ; script PHP → `php -l` + PHPStan/PHPCS ; worker Python → test sur petit fichier + Ruff ; avant livraison sensible → Gitleaks. Un développement n'est **pas stabilisé** si les tests requis manquent sans justification (cf. `2-trame_travail-lumosphere.md`).

## Critères de validation globaux

- Les documents ne se contredisent plus.
- La **bibliothèque web** affiche les **données de test** avant les chaînes lourdes.
- Les **droits par œuvre** s'appliquent **côté serveur** sur toutes les lectures.
- L'éditeur produit un **Markdown propre** ; recherche **rapide sur 50 000 entrées**.
- L'**intégration au corpus** respecte les règles (conformité, transaction, **intégration ≠ publication**).
- **Aucun secret en dur** ; les exports reflètent exactement les résultats affichés.
- **Droits MySQL** applicatifs restreints (SELECT/INSERT/UPDATE/DELETE) avant mise en service (cf. migration Phase 2/Annexe A).

---

## Récapitulatif

| Phase | Périmètre | Livrable principal |
| --- | --- | --- |
| I | Socle | Composants vérifiés, **schéma corpus+auth validé**, DAL, spéc éditeur, mapping, données de test. |
| **II** | **Socle UI visualisable** | **Login + bibliothèque en lecture sur données de test.** |
| III | Bibliothèque complète | Rôles/droits, référentiels, consultation, **recherche (étude+codage)**, éditeur, gestion entrées, IA. |
| IV | Chaînes → corpus | Pont validation→corpus, Telegram, **composants communs**, **poste de pilotage**, PDF, YouTube, HTML, nettoyage historique. |
| V | Modules | Médiathèque, bibliothèque docs, notifications, Telegram manuel, sauvegardes, magasins. |
| VI | Exports | Document Builder, PDF Typst, EPUB Pandoc, config, publication. |
| VII | Évolutions | RAG, mobile, Tauri (hors périmètre initial). |
