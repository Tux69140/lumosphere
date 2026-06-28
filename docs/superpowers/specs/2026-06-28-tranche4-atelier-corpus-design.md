# Tranche 4 — Pont atelier→corpus + chaîne Telegram

Date : 2026-06-28

## Contexte

Tranche 3 terminée : la bibliothèque est fonctionnelle (affichage, recherche, filtres, éditeur, RBAC, IA). La Tranche 4 connecte l'**atelier** (zone de préparation des textes bruts) au **corpus** (la bibliothèque finale). Elle met aussi en place la **première chaîne de production complète** (Telegram).

T23 (promotion webServices) est **déjà faite** — l'`apiClient` unifié remplace l'ancien pattern mockServices/createServices.

Code réutilisable identifié dans `/home/stef/Documents/Lulu/pretraitement/` :
- `serveur/epuriel/workers/process_telegram_v1.py` — worker Telegram (nettoyage, extraction, enrichissement)
- `serveur/epuriel/workers/ia_provider_litteraire.py` — provider IA (suggestions thèmes/mots-clés)
- `outils/telechargeur_fichiers_telegram/` — collecteur Telegram (déjà en service via crons)

Infrastructure Telegram existante (crons o2switch) :
- Collecte toutes les 12h
- Agrégation à 16h45
- run_jobs à 17h15
- Horaires à confirmer

---

## Décisions de design (validées par le chef de projet)

| # | Sujet | Décision |
|---|-------|----------|
| 1 | Agrégation Telegram | Hybride : lot auto hebdomadaire + ajustement par l'éditeur |
| 2 | Déclenchement IA | Passe 1 automatique (à l'arrivée en révision), passe 2 manuelle (bouton) |
| 3 | État "pausé" | Différé — pas en v1, 8 états seulement |
| 4 | Traçabilité post-intégration | Journal conservé 90 jours + chaque citation garde un lien vers son lot d'origine |
| 5 | Visibilité lots | Tous les éditeurs voient tous les lots, filtre "Mes lots" disponible |
| 6 | Composants atelier v1 | 6 composants : ListeLots, DetailLot, JournalLot, ÉditeurRévision, SuggestionsIA, BlocErreur. Différés en T5 : ExplorateurFichiers, AperçuContenu |
| 7 | Worker→Corpus | Pattern standard : worker Python → JSON stdout → PHP parse et insère |
| 8 | T23 | Déjà terminée (apiClient unifié en place) |
| 9 | Actions batch dashboard | Lot par lot uniquement, pas d'actions groupées |
| 10 | Bot Telegram | Déjà opérationnel (crons collecte/agrégation/jobs en place) |
| 11 | Révision messages | Sélection/exclusion + édition du texte, pas de fusion/découpage |
| 12 | Conformité | Uniforme toutes sources : thème + date + auteur (œuvre) + ≥1 mot-clé |
| 13 | Mapping messages | 1 message Telegram = 1 citation dans le corpus |
| 14 | Layout dashboard | Tableau TanStack + sidebar filtres (cohérent avec la bibliothèque) |

---

## T24 — Intégration directe (abandon du pivot fichier)

### Principe

L'ancien système écrivait un fichier `.pivot.json` intermédiaire. Le nouveau système **écrit directement dans le corpus en transaction SQL** quand un lot est validé.

### Implémentation

**Migration SQL** (`db/migrations/010_atelier_tranche4.sql`) — les tables atelier **existent déjà** sur le serveur (héritées d'Epuriel). La migration les modifie :

**ALTER `lots`** :
- Status ENUM : 14 valeurs → 8 (`en_attente`, `en_cours`, `en_traitement`, `en_revision`, `a_reprendre`, `pret`, `integre`, `erreur`)
- `assigned_to` : VARCHAR(100) → INT UNSIGNED FK users
- Nouvelles colonnes : `created_by`, `description`, `error_message`, `integrated_at`

**ALTER `documents`** :
- Status ENUM : même migration 14 → 8
- `type_document` : nettoyage (`Telegram` → `telegram`, etc.) → 4 valeurs propres
- Nouvelles colonnes : `source_item_id`, `contenu_brut`, `contenu_revise`, `hash_contenu`, `selected`, `theme_id`, `oeuvre_id`, `citation_id`

**CREATE `lot_document_keywords`** : nouvelle table (document_id + keyword_id + source manual/ai_suggested/ai_accepted)

**ALTER `journal_events`** : status ENUMs 14 → 8, ajout `actor_id` FK users

**ALTER `citations`** : ajout `lot_origin_id` INT UNSIGNED FK lots (traçabilité)

Les tables `server_jobs`, `collect_sources`, `telegram_updates_buffer` restent inchangées (déjà opérationnelles).

### DAL PHP

Nouveau fichier `api/dal/lots.php` avec fonctions :
- `dal_create_lot()` — créer un lot
- `dal_find_lots()` — lister avec filtres (source, status, assigned_to) + keyset pagination
- `dal_get_lot()` — détail d'un lot avec ses documents
- `dal_update_lot_status()` — transition d'état (avec validation machine d'états)
- `dal_assign_lot()` — assigner un lot à un éditeur
- `dal_integrate_lot()` — transaction : insérer les documents→citations + marquer lot intégré

### Endpoint PHP

Nouveau fichier `api/endpoints/lots.php` :
- `GET /api/lots` — liste filtrée
- `GET /api/lots/{id}` — détail
- `PUT /api/lots/{id}/status` — transition d'état
- `PUT /api/lots/{id}/assign` — assigner
- `POST /api/lots/{id}/integrate` — lancer l'intégration corpus
- `GET /api/lots/{id}/journal` — historique

Permissions requises : `atelier.access` (lecture), `atelier.lots` (gestion), `atelier.validate` (intégration).

---

## T25 — Mapping atelier→corpus + conformité + dédup

### Contrat de mapping

Chaque `lot_document` sélectionné (`selected = 1`) produit une `citation` :

| Source (lot_document) | → | Destination (citation) |
|-----------------------|---|------------------------|
| `contenu_revise` (ou `contenu_brut` si pas révisé) | → | `citations.contenu` |
| `oeuvre_id` | → | `citations.oeuvre_id` |
| `theme_id` | → | `citations.theme_id` |
| `date_publication` | → | `citations.date_publication` |
| `source_item_id` | → | `citations.telegram_message_id` (si Telegram) |
| lot_document_keywords (accepted) | → | `citation_keywords` |
| — | → | `citations.etat_id` = "À Corriger" (toujours) |
| lot.id | → | `citations.lot_origin_id` (traçabilité) |

### Garde de conformité

Fonction `dal_check_lot_conformity($pdo, $lot_id)` vérifie pour chaque document sélectionné :

1. `oeuvre_id` non null (→ auteur déduit via la relation oeuvre→auteur)
2. `theme_id` non null
3. `date_publication` non null
4. Au moins 1 mot-clé dans `lot_document_keywords`

Retourne la liste des erreurs bloquantes par document. Si ≥1 erreur → intégration refusée.

### Stratégie de déduplication

Avant insertion, vérifier pour chaque document :
- Si `source_item_id` non null : `SELECT id FROM citations WHERE telegram_message_id = ?`
- Sinon : `SELECT id FROM citations WHERE hash_contenu = ?` (SHA-256 du contenu)
- Si doublon trouvé → erreur non bloquante (avertissement), document exclu de l'intégration

---

## T26 — Pont validation→corpus (transaction)

### Flow

```
Éditeur clique "Intégrer" sur un lot "prêt"
    ↓
dal_check_lot_conformity() → erreurs ? → retour en "en_révision"
    ↓ (OK)
BEGIN TRANSACTION
  Pour chaque lot_document sélectionné :
    1. Vérifier dédup (skip si doublon)
    2. INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, date_publication, telegram_message_id, lot_origin_id)
    3. INSERT INTO citation_keywords (citation_id, keyword_id) pour chaque mot-clé
    4. UPDATE lot_documents SET citation_id = <new_id>
  UPDATE lots SET status = 'integre', integrated_at = NOW()
  INSERT INTO lot_journal (event_type = 'integrated')
COMMIT
    ↓
Si config.mode_debug_global = OFF → supprimer le dossier lot (server_lot_path)
Si ON → conserver pour diagnostic
    ↓
Réponse : nombre de citations créées, doublons ignorés
```

### Colonne de traçabilité

Ajouter `lot_origin_id INT UNSIGNED NULL` dans la table `citations` (FK vers `lots.id`, SET NULL quand le lot est purgé après 90 jours).

---

## T27 — Machine d'états des lots

### 8 états (sans "pausé")

`en_attente` → `en_cours` → `en_traitement` → `en_revision` → `pret` → `integre`

Branches : `en_traitement` → `erreur` (échec worker), `en_revision` → `a_reprendre` → `en_cours` (cycle correctif).

### Transitions valides

| De | Vers | Déclencheur | Action |
|----|------|-------------|--------|
| `en_attente` | `en_cours` | Éditeur prend le lot | Assigner `assigned_to` |
| `en_cours` | `en_traitement` | Lancement du job | Créer `server_jobs` |
| `en_traitement` | `en_revision` | Worker OK | Contenu prêt pour révision |
| `en_traitement` | `erreur` | Worker échoué | Logger dans `lot_journal` |
| `erreur` | `en_traitement` | Retry (éditeur/admin) | Nouveau job créé |
| `en_revision` | `pret` | Éditeur valide conformité | Garde conformité passe |
| `en_revision` | `a_reprendre` | Éditeur renvoie | Retour corrections |
| `a_reprendre` | `en_cours` | Éditeur reprend | Cycle redémarre |
| `pret` | `integre` | Intégration corpus (txn) | Lot supprimé (sauf debug) |

### Implémentation

`dal_update_lot_status($pdo, $ctx, $lot_id, $new_status)` :
1. SELECT current status FOR UPDATE (verrou)
2. Vérifier que la transition est dans la table ci-dessus
3. UPDATE lots SET status
4. INSERT lot_journal
5. Actions spécifiques (assign, create job, etc.)

---

## T28 — Chaîne Telegram complète

### Pipeline

```
[Crons existants]
Collecte 2x/jour → telegram_updates_buffer
Agrégation (16h45) → crée lot "en_attente" avec documents
run_jobs (17h15) → lance le worker si lot "en_traitement"

[Nouveau code Tranche 4]
Éditeur ouvre lot → ajuste la sélection → lance traitement
Worker Python (adapté de process_telegram_v1.py) :
  - Nettoyage (hashtags, mise en forme)
  - Segmentation
  - Formatage Markdown
  → JSON stdout → PHP met à jour lot_documents.contenu_revise
  → lot passe en "en_revision"
  
IA passe 1 (automatique) :
  - LiteLLM suggère thèmes + mots-clés par document
  → Stockés dans lot_document_keywords (source = 'ai_suggested')
  
Éditeur révise :
  - Accepte/refuse suggestions IA
  - Corrige le texte si besoin
  - Assigne thème, œuvre, date, mots-clés
  
IA passe 2 (bouton manuel) :
  - Synonymes/compléments basés sur les choix validés
  
Éditeur clique "Prêt" → garde conformité → lot "pret"
Éditeur clique "Intégrer" → transaction corpus → lot "integre"
```

### Agrégation hybride

Le cron d'agrégation (16h45) crée automatiquement un lot hebdomadaire avec les messages du buffer. L'éditeur peut ensuite :
- Retirer des messages (décocher `selected`)
- Modifier le texte de chaque message
- Les métadonnées (thème, œuvre, mots-clés) sont ajoutées pendant la révision

### Worker Python

Adapter `process_telegram_v1.py` du dépôt `pretraitement` :
- Entrée : JSON stdin (liste de messages bruts, config lot)
- Sortie : JSON stdout (messages nettoyés/formatés en Markdown)
- Respecter la garde anti-résumé (pas >20% plus court que l'original)
- Pas de fichiers pivot — tout en mémoire/JSON

### Dédup Telegram

- Clé primaire de dédup : `telegram_message_id`
- Vérifié à l'agrégation (pas de doublon dans le buffer → lot)
- Vérifié à l'intégration (pas de doublon lot → corpus)
- `collect_sources.last_marker` mis à jour après chaque agrégation

---

## T29 — 6 composants réutilisables

Tous dans `src/features/atelier/components/` :

### 1. ListeLots
- Tableau TanStack Table
- Colonnes : ID, source, statut (badge couleur), éditeur assigné, date création, actions
- Filtrage via sidebar (source, statut, éditeur)
- Tri sur toutes les colonnes
- Keyset pagination
- Filtre rapide "Mes lots"

### 2. DetailLot
- En-tête : métadonnées du lot (ID, source, éditeur, dates, statut)
- Liste des documents avec checkbox sélection
- Aperçu du contenu de chaque document
- Boutons d'action selon l'état (prendre, lancer, valider, intégrer, retry)
- Affichage des erreurs (BlocErreur intégré)

### 3. JournalLot
- Timeline d'événements : créé, pris, traitement, révision, erreur, intégré...
- Par événement : date/heure, acteur (nom ou "système"), type, message
- Filtre par type d'événement

### 4. ÉditeurRévision
- Réutilise l'éditeur Markdown Milkdown (T19, déjà construit)
- Un document à la fois, navigation entre documents du lot
- Sauvegarde dans `lot_documents.contenu_revise`
- Boutons : sauvegarder, passer au suivant, marquer comme exclu

### 5. SuggestionsIA
- Panneau latéral ou section sous chaque document
- Affiche les suggestions (thèmes, mots-clés) avec boutons accepter/refuser
- Passe 1 : s'affiche automatiquement à l'arrivée en révision
- Passe 2 : bouton "Demander plus de suggestions"
- Chaque suggestion acceptée → `lot_document_keywords` (source = 'ai_accepted')
- Pas d'auto-application — toujours validation humaine

### 6. BlocErreur
- Erreurs bloquantes (rouge) : empêchent l'intégration (ex: "thème manquant")
- Avertissements (jaune) : informatifs (ex: "doublon détecté")
- Bouton retry (si erreur worker)
- Lien vers le journal pour le contexte complet

---

## T30 — Poste de pilotage atelier

### Layout

Même structure que la bibliothèque :
- **Sidebar gauche** : filtres (source, statut, éditeur assigné, période)
- **Zone principale** : tableau ListeLots
- **Header** : compteurs rapides (en attente : N, en erreur : N, prêts : N)

### Filtres sidebar

- **Source** : Telegram / PDF / YouTube / HTML (multi-select)
- **Statut** : tous les 8 états (multi-select)
- **Éditeur** : dropdown liste des éditeurs + "Mes lots" (raccourci)
- **Période** : date de création (de → à)

### Actions par lot (dans le tableau ou le détail)

| Action | Visible si statut | Permission |
|--------|-------------------|------------|
| Prendre en charge | `en_attente` | `atelier.lots` |
| Lancer le traitement | `en_cours` | `atelier.lots` |
| Voir le détail / réviser | `en_revision` | `atelier.lots` |
| Retry | `erreur` | `atelier.lots` |
| Marquer prêt | `en_revision` | `atelier.lots` |
| Intégrer au corpus | `pret` | `atelier.validate` |
| Réassigner | tout sauf `integre` | Admin seulement |

### Navigation

- Clic sur un lot → page `DetailLot` (avec onglets : documents, journal, erreurs)
- Retour au dashboard via breadcrumb ou bouton retour

---

## Fichiers à créer/modifier

### Nouveaux fichiers

| Fichier | Rôle |
|---------|------|
| `db/migrations/010_atelier_tranche4.sql` | ALTER lots/documents/journal_events + CREATE lot_document_keywords + ALTER citations |
| `db/rollback/010_atelier_tranche4_rollback.sql` | Rollback migration |
| `db/verify/010_verify_atelier.sql` | Script de vérification |
| `api/dal/lots.php` | DAL lots (CRUD, machine d'états, conformité, intégration) |
| `api/endpoints/lots.php` | API REST lots |
| `src/features/atelier/AtelierPage.tsx` | Page poste de pilotage |
| `src/features/atelier/LotDetailPage.tsx` | Page détail lot |
| `src/features/atelier/components/ListeLots.tsx` | Tableau lots |
| `src/features/atelier/components/DetailLot.tsx` | Vue détail |
| `src/features/atelier/components/JournalLot.tsx` | Timeline événements |
| `src/features/atelier/components/EditeurRevision.tsx` | Éditeur contenu lot |
| `src/features/atelier/components/SuggestionsIA.tsx` | Panneau suggestions |
| `src/features/atelier/components/BlocErreur.tsx` | Affichage erreurs |
| `src/features/atelier/types.ts` | Types TypeScript atelier |
| `src/features/atelier/useLots.ts` | Hooks React Query |
| `workers/process_telegram_v2.py` | Worker Telegram adapté |

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/services/api.ts` | Ajouter méthodes lots (CRUD, status, assign, integrate, journal) |
| `src/services/queryKeys.ts` | Ajouter clés lots |
| `api/router.php` | Ajouter route `/api/lots` |
| `api/dal/citations.php` | Ajouter colonne `lot_origin_id` aux INSERT |
| `src/App.tsx` (ou routes) | Ajouter routes `/atelier`, `/atelier/lot/:id` |
| `src/components/Header.tsx` | Lien navigation vers Atelier (si permission) |
| `docs/1-trame_execution-lumosphere.md` | Cocher T23-T30 au fur et à mesure |

---

## Vérification

1. **Migration** : `010_atelier.sql` s'exécute sans erreur, tables créées avec bonnes FK
2. **Machine d'états** : tester chaque transition valide + vérifier que les transitions invalides sont rejetées
3. **Conformité** : un lot incomplet (ex: sans thème) est bloqué à l'intégration
4. **Dédup** : un message Telegram déjà intégré est détecté et signalé
5. **Intégration** : un lot "prêt" avec 3 documents → 3 citations créées dans le corpus, visibles en bibliothèque, état "À Corriger"
6. **Suppression lot** : après intégration, le dossier est supprimé (sauf debug mode)
7. **Traçabilité** : la citation porte `lot_origin_id`, le journal montre "intégré le X par Y"
8. **Dashboard** : filtres fonctionnels, compteurs corrects, actions visibles selon statut/permission
9. **Tests Vitest** : machine d'états (transitions), conformité (cas passant/bloquant), mapping (lot_document→citation)
10. **Build** : `pnpm lint` + `pnpm build` + `pnpm tsc --noEmit` passent
