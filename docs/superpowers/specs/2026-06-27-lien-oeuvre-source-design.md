# Design — Lier une œuvre à sa source de collecte

**Date** : 2026-06-27  
**Contexte** : Admin Œuvres (Tranche 3) — liaison œuvre ↔ collect_source, affichage dans le détail

---

## Périmètre

Permettre à l'admin de lier une œuvre à une source de collecte existante (`collect_sources`) et d'afficher cette association dans la fiche œuvre. La création, suppression et configuration des sources reste hors périmètre (Phase 4, T30).

---

## Base de données

Aucune migration nécessaire. La colonne `oeuvre_id` existe déjà dans `collect_sources`. La relation est 1:1 (une œuvre = une source max, une source = une œuvre max). Pour changer de lien : on remet `oeuvre_id = NULL` sur l'ancienne source, puis on écrit le nouvel `oeuvre_id`.

---

## API PHP

### 1. `GET /api/oeuvres` — enrichissement

Le endpoint existant ajoute un LEFT JOIN avec `collect_sources` pour retourner deux champs supplémentaires par œuvre :

```json
{ "source_id": 2, "source_label": "Lulumineuse" }
```

`source_id` et `source_label` sont `null` si aucune source n'est liée.

### 2. `GET /api/collect_sources` — nouveau endpoint

Retourne la liste complète des sources (lecture seule) :

```json
[
  { "id": 2, "label": "Lulumineuse", "source_type": "telegram" },
  { "id": 3, "label": "Stéphane",    "source_type": "telegram" }
]
```

Droits : admin uniquement.

### 3. `POST /api/oeuvres/{id}/source` — nouveau endpoint

Corps : `{ "source_id": 2 }` ou `{ "source_id": null }` pour délier.

Logique :
1. Vérifier que l'œuvre `{id}` existe.
2. Si `source_id` non null : vérifier que la source existe.
3. Remettre `oeuvre_id = NULL` sur toute source actuellement liée à `{id}`.
4. Si `source_id` non null : écrire `oeuvre_id = {id}` sur la source cible.
5. Réponse standard `{ "status": "ok" }`.

Droits : admin uniquement. Vérification CSRF obligatoire.

---

## Couche services (abstraction)

Respect de la règle : les composants React n'appellent jamais `fetch` directement.

**`apiClient.ts`** — 2 ajouts :
- `findCollectSources()` → `GET /api/collect_sources`
- `linkOeuvreSource(oeuvreId, sourceId | null)` → `POST /api/oeuvres/{id}/source`

**`referenceQueries.ts`** — 1 ajout :
- `useCollectSources()` — hook `useQuery` wrappant `apiClient.findCollectSources()`

**`queryKeys.ts`** — 1 ajout :
- `collectSources: ['collectSources']`

---

## Frontend — OeuvresPage

La section "Source de collecte" s'ajoute en bas du formulaire existant, après le champ "Description".

**Affichage** : menu déroulant peuplé par `useCollectSources()`. Chaque option affiche `label — type` (ex : "Lulumineuse — telegram"). Option vide "— Aucune —" en tête.

**Interaction** : sélection déclenche immédiatement une mutation `linkOeuvreSource`. Pas de bouton "Enregistrer" supplémentaire — le lien est indépendant du reste du formulaire. Toast succès/erreur standard.

**Invalidation** : après mutation réussie, invalider `queryKeys.oeuvres` et `queryKeys.collectSources`.

**État initial** : la valeur sélectionnée au chargement est `source_id` retourné par `useOeuvres()`.

---

## Ce qui n'est PAS fait

- Créer / supprimer / configurer une source (Phase 4, T30)
- Afficher la source dans la liste latérale des œuvres (reprise UI ultérieure)
- Affichage du canal dans d'autres vues

---

## Tests

- Vitest : mutation `linkOeuvreSource` avec source valide, avec `null`, avec source déjà liée à une autre œuvre
- Manuel : lier une source → vérifier en BDD ; délier → vérifier `oeuvre_id = NULL`
