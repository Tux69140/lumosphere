# Trame d'exécution Lumosphère

> Document d'orchestration séquencé. Chaque tâche pointe vers sa source (devbook migration ou développement). Lire **uniquement la tranche courante** + la section référencée du devbook concerné.
>
> **Légende** : `[Mig §X]` = devbook migration, `[Dev §X]` = devbook développement, `[NOUVEAU]` = complément ajouté aux devbooks.

┌────────────────────┬────────────────────┬────────────────────────────────────────┐
│       Étape        │  Agents utiles ?   │                Pourquoi                │
├────────────────────┼────────────────────┼────────────────────────────────────────┤
│ 3.6–3.7 + 3bis     │ Non                │ Travail séquentiel sur la base         │
│ (maintenant)       │                    │                                        │
├────────────────────┼────────────────────┼────────────────────────────────────────┤
│ T05–T08 (Tranche   │ Oui, 2 en          │ Audit front // DAL PHP, puis squelette │
│ 1)                 │ parallèle          │  React // auth PHP                     │
├────────────────────┼────────────────────┼────────────────────────────────────────┤
│ T10–T14 (Tranche   │ Oui, 2 en          │ Config FULLTEXT base // vue React      │
│ 2)                 │ parallèle          │ cartes, puis recherche // droits DAL   │
├────────────────────┼────────────────────┼────────────────────────────────────────┤
│ T15–T22 (Tranche   │ Oui, 3-4 en        │ Modules UI indépendants                │
│ 3)                 │ parallèle          │                                        │
├────────────────────┼────────────────────┼────────────────────────────────────────┤
│ T28–T35 (Tranches  │ Oui, chaînes       │ Telegram // PDF // YouTube // HTML     │
│ 4-5)               │ indépendantes      │                                        │
└────────────────────┴────────────────────┴────────────────────────────────────────┘

> **Phase 3bis scindée** : seule sa part « réglages + règles » se fait **maintenant** avec 3.6–3.7 (interrupteur mode débogage global + rétention journal 90 j en base — fait). Le reste dépend du code des chaînes et de l'intégration corpus : **dossiers de lots minimalistes, arrêt des fichiers `manifest.json`/`journal.csv`, purge du tampon Telegram, journal allégé** → pendant la **Phase 4** (T28–T35) ; **effacement du lot après import + nettoyage auto** → à la **Phase 6.3** (intégration corpus). Détail des préfixes `[maintenant]`/`[Phase 4]`/`[Phase 6.3]` dans le devbook migration, section Phase 3bis.

---

## Tranche 1 — Socle auth + premier affichage

| # | Source | Tâche | Prérequis |
|---|--------|-------|-----------|
| ~T01~ | Mig §3.3 | Tables auth (users, roles, permissions, role_oeuvre_access, active_sessions) | Mig §3.1–3.2 ✓ |
| ~T02~ | Mig §3.4 | Tables modules (mediatheque, bibliotheque, notifications, config, etc.) | T01 |
| ~T03~ | Mig §3.6 + §3.7 | Seeds : rôles (Admin protégé, Éditeur, Visiteur, Abo3, Abo4), états (C/R/P), admin initial, thèmes | T01, T02 |
| ~T04~ | Mig §3.3 complément | Décision stockage sessions : fichier PHP natif + table `active_sessions` pour journal/invalidation | T01 |
| ~T05~ | Dev §I.2 | Audit composants présents/à installer (React 19, Tailwind, Phosphor, pnpm, Vitest, Playwright…) | — |
| ~T06~ | Dev §I.4 | DAL MySQL PDO — module central + règles métier (droits, soft-delete, verrous, keyset) | T01, T03 |
| ~T07~ | Mig §6.2 | Auth serveur PHP : POST /auth/login, /auth/logout, session httpOnly/Secure/SameSite, CSRF, rate-limit | T04, T06 |
| T08 | Dev §I.7 | Squelette React : layout, routing, thème clair/sombre, charte Phosphor, services web (fetch + credentials) | T05 |
| ~T09~ | Dev §II.1 | Écran login + redirection post-auth | T07, T08 |

**✓ VALIDATION** : un éditeur se connecte via le navigateur → session PHP active, cookie sécurisé visible.

---

## Tranche 2 — Bibliothèque visible

| # | Source | Tâche | Prérequis |
|---|--------|-------|-----------|
| ~T10~ | Dev §I.3 + §I.7 | Seed données de test corpus (citations + auteurs + œuvres) | T06 |
| ~T11~ | Dev §III.4 complément | Config FULLTEXT : `BOOLEAN MODE`, `innodb_ft_min_token_size=2`, stopwords FR, tri par défaut | T10 |
| ~T12~ | Dev §II.1 | Vue bibliothèque lecture : liste de cards (titre, auteur, extrait Markdown rendu, thème, état) | T08, T10 |
| ~T13~ | Dev §II.1 | Recherche basique : fulltext + filtres thème/œuvre/auteur | T11, T12 |
| ~T14~ | Dev §III.1 + §I.3 complément | Droits rôle/œuvre appliqués dans la DAL (matrice RBAC) | T06, T10 |

**✓ VALIDATION** : éditeur voit et filtre les citations. Abo3 ne voit que ses œuvres autorisées. Recherche accent-insensible fonctionnelle.

---

## Tranche 3 — Index complet

| # | Source | Tâche | Prérequis |
|---|--------|-------|-----------|
| ~T15~ | Dev §I.5 + complément | Décision éditeur Markdown : évaluation candidats (~TipTap/~ Milkdown ~/MDXEditor/BlockNote~), prototype | — (peut commencer en parallèle) |
| ~T16~ | Dev §III.2 | Référentiels CRUD admin : auteurs, œuvres, thèmes (≤2 niveaux), mots-clés (normalisés), états, emojis | T14 |
| T17 | Dev §III.3 | Consultation publique complète : header sticky, panneau filtres, zone résultats, badges actifs, favoris et retour à la page précédente lors d'un login (reliquat de T09) | T13, T16 |
| ~T18~ | Dev §III.4 | Moteur de recherche complet : OR/AND mots-clés, pagination keyset, debounce 300ms, virtualisation >200 | T11, T17 |
| ~T19~ | Dev §III.5 | Éditeur Markdown riche (implémentation selon T15) | T15 |
| ~T20~ | Dev §III.6 | Gestion entrées : table TanStack, bulk actions, soft-delete, quick edit, verrou concurrent | T16, T19 |
| T21 | Dev §III.7 | IA LiteLLM : config providers, suggestions mots-clés/thèmes, validation humaine obligatoire | T16 |
| T22 | Dev §III.8 | Tests Phase III : unit DAL, droits Abo3/Abo4, perfs (1k/10k/50k), accessibilité | T14–T21 |

**✓ VALIDATION** : bibliothèque complète fonctionnelle. Éditeur peut créer/modifier/publier. Recherche rapide à 50k entrées.

> **Socle transverse T16–T20** : l'état serveur (données distantes) est géré par **TanStack Query**, branché **par-dessus** la couche de services (cache, chargement/erreur, invalidation après mutation). Détail : Dev §III.0 ; décision stack : §3 du document stack technique.

---

## Tranche 4 — Pont atelier→corpus + première chaîne

| # | Source | Tâche | Prérequis |
|---|--------|-------|-----------|
| T23 | Mig §6.1 | ✅ Promotion web : renommer mockServices → webServices, simplifier createServices | T08 |
| T24 | Mig §6.3 | ✅ Réécriture pivot→corpus : intégration directe en transaction, abandon fichier pivot | T06 |
| T25 | Dev §I.6 | ✅ Mapping atelier→corpus : contrat, garde conformité (jeu complet), hash dedup | T24 |
| T26 | Dev §IV.1 | ✅ Pont validation lot → écriture corpus + suppression lot | T24, T25 |
| T27 | Mig §6.3 complément | ✅ Machine d'états des lots : implémentation des transitions (cf. diagramme ajouté) | T26 |
| T28 | Dev §IV.2 | ✅ Chaîne Telegram complète : bot→agrégation→révision→IA→corpus, dedup | T26, T27 |
| T29 | Dev §IV.3 | ✅ Extraction composants communs : ListeLots, DetailLot, JournalLot, EditeurRevision, SuggestionsIA | T28 |
| T30 | Dev §IV.4 | ✅ Poste de pilotage atelier : filtres source/statut, assignation, retry, erreurs | T27, T29 |

**✓ VALIDATION** : un lot Telegram traverse toute la chaîne → entrée visible en bibliothèque. Poste de pilotage opérationnel.

> **Implémentation Tranche 4** (2026-06-28) : migration SQL 010 (ALTER tables existantes), DAL+API PHP `api/dal/lots.php` + `api/endpoints/lots.php`, worker Python `workers/process_telegram_v2.py`, frontend React 6 composants + 2 pages dans `src/features/atelier/`. Spec : `docs/superpowers/specs/2026-06-28-tranche4-atelier-corpus-design.md`. **En attente de validation/test sur serveur (migration SQL + déploiement).**

---

## Tranche 5 — Chaînes restantes

| # | Source | Tâche | Prérequis |
|---|--------|-------|-----------|
| T31 | Mig §4.1–4.5 | Validation serveur : venv py311 déplacé, capacités confirmées, outils absents documentés | — |
| T32 | Mig §4 complément | Décision OCR : option A retenue (différé, text-only via PyMuPDF en v1) | T31 |
| T33 | Dev §IV.5 | Chaîne PDF : extraction texte PyMuPDF, segmentation, Markdown, corpus (sans OCR en v1) | T26, T32 |
| T34 | Dev §IV.6 | Chaîne YouTube : yt-dlp + transcript, 2 passes LiteLLM (Map/Clean), garde anti-résumé >20%, timecodes | T26 |
| T35 | Dev §IV.7 | Chaîne HTML/texte collé : extraction URL, HTML→Markdown, cleanup, segmentation, corpus | T26 |
| T36 | Dev §IV.8 | Nettoyage historique volontaire (admin) : purge buffer Telegram, suppression lots anciens | T30 |

**✓ VALIDATION** : chaque chaîne (PDF text, YouTube, HTML) produit une entrée validée en bibliothèque.

---

## Tranche 6 — Modules complémentaires + PWA

| # | Source | Tâche | Prérequis |
|---|--------|-------|-----------|
| T37 | Dev §V.1 | Médiathèque : upload JPG/PNG/GIF/WebP/SVG, 2Mo, thumbnails, alt text | T19 (éditeur = insère images) |
| T38 | Dev §V.2 | Bibliothèque documents : PDF/EPUB téléchargeables, visibilité par rôle | T14 |
| T39 | Dev §V.3 | Notifications visiteur : formulaire contact (honeypot + CSRF), table admin | T07 |
| T40 | Dev §V.4 | Import Telegram manuel : config chiffrée, canaux→œuvres, import transactionnel, dedup | T28 |
| T41 | Dev §V.5 | Sauvegardes/restauration : dump base + média + bibliothèque, restore contrôlé | T37, T38 |
| T42 | Mig §6.6 | PWA : manifest.json, service worker (installabilité, pas de cache offline), responsive | T17 |
| T43 | Dev §V.6 | Packaging stores : PWABuilder MSIX (Microsoft Store), TWA + assetlinks (Google Play) | T42 |

**✓ VALIDATION** : app installable en PWA. Médiathèque et documents fonctionnels. Formulaire contact opérationnel.

---

## Tranche 7 — Exports + nettoyage final

| # | Source | Tâche | Prérequis |
|---|--------|-------|-----------|
| T44 | Dev §VI.1–VI.5 | Exports : Document Builder + PDF Typst + EPUB Pandoc + publication en bibliothèque | T17, T38 |
| T45 | Mig §5.1–5.5 | Renommages user-facing restants (localStorage, env vars, labels UI) | T23 |
| T46 | Mig §8.1–8.6 | Workers Python : réorganisation, archivage outils obsolètes | T28, T33, T34, T35 |
| T47 | Mig §9.1–9.7 | Vérification finale : lint/build/tests, cutover, suppression ancienne base, archivage repos | Tout |

**✓ VALIDATION** : projet livré. Exports fonctionnels. Anciens dépôts archivés. Base propre.

---

## Utilisation par l'IA (workflow token-efficient)

À chaque session de travail :
1. **Lire cette trame** → identifier la tâche courante (première non cochée)
2. **Lire la section source** indiquée (ex: "Dev §III.4" → ouvrir le devbook développement à la section III.4)
3. **Lire le fichier contexte-IA pertinent** si besoin (architecture, schéma, conventions)
4. **Coder** la tâche
5. **Cocher** dans cette trame (`- [x]`) et dans le devbook source
6. **Passer à la suivante**

Ne jamais lire les deux devbooks en entier. La trame suffit pour le séquençage.
