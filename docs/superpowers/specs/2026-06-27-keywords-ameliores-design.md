# Design — Mots-clés améliorés

**Date** : 2026-06-27  
**Contexte** : Admin Mots-clés — surbrillance, édition inline, suppression protégée avec liste des entrées concernées

---

## Périmètre

Trois améliorations de la vue admin `KeywordsPage` :
1. Surbrillance des lignes au survol
2. Édition inline du libellé d'un mot-clé
3. Suppression bloquée si le mot-clé est utilisé, avec affichage des titres des entrées concernées

---

## Base de données

Aucune migration. Les données existent : `keywords` (id, mot) et `citation_keywords` (citation_id, keyword_id). Les citations ont un champ `contenu` et `auteur_id` utilisables comme titre de secours.

---

## API PHP

### 1. `GET /api/keywords` — enrichissement

Ajouter un LEFT JOIN COUNT pour retourner `citation_count` par mot-clé :

```sql
SELECT k.id, k.mot, COUNT(ck.citation_id) AS citation_count
FROM keywords k
LEFT JOIN citation_keywords ck ON ck.keyword_id = k.id
GROUP BY k.id, k.mot
ORDER BY k.mot
```

Chaque mot-clé retourné : `{ id, mot, citation_count }`.

### 2. `PUT /api/keywords/{id}` — nouveau endpoint

Corps : `{ "mot": "nouveau libellé" }`.

Logique :
1. Vérifier que le mot-clé `{id}` existe.
2. Normaliser : `mb_strtolower(trim($mot))`.
3. Vérifier que le mot normalisé n'est pas vide.
4. `UPDATE keywords SET mot = :mot WHERE id = :id` (erreur 23000 = doublon → message clair).
5. Réponse : `{ "status": "ok", "data": { "id": id } }`.

Permission : `keywords.manage`. CSRF obligatoire.

### 3. `GET /api/keywords/{id}/usages` — nouveau endpoint

Retourne les citations qui utilisent ce mot-clé :

```sql
SELECT c.id AS citation_id,
       LEFT(c.contenu, 80) AS titre
FROM citations c
JOIN citation_keywords ck ON ck.citation_id = c.id
WHERE ck.keyword_id = :id AND c.deleted_at IS NULL
ORDER BY c.id
LIMIT 50
```

Réponse : `[{ citation_id, titre }]`. Limité à 50 (cas extrême).

Permission : `keywords.manage`.

### 4. `DELETE /api/keywords/{id}` — protection

Avant de supprimer, vérifier `COUNT(*) FROM citation_keywords WHERE keyword_id = :id`. Si > 0, retourner une erreur explicite. Double sécurité côté serveur (même si l'UI bloque déjà).

---

## Couche services (abstraction)

**`api.ts`** — 2 ajouts :
- `updateKeyword(id: number, mot: string)` → `PUT /api/keywords/{id}`
- `getKeywordUsages(id: number)` → `GET /api/keywords/{id}/usages`

**`referenceQueries.ts`** — mise à jour du type :
- `Keyword` devient `{ id: number; mot: string; citation_count: number }`

**`referenceQueries.ts`** — 1 ajout :
- `useKeywordUsages(id: number, enabled: boolean)` — hook `useQuery` wrappant `apiClient.getKeywordUsages(id)`, actif uniquement quand `enabled === true`

**`queryKeys.ts`** — 1 ajout :
- `keywordUsages: (id: number) => ['keywords', 'usages', id] as const`

---

## Frontend — KeywordsPage

### Surbrillance

Ajouter `hover:bg-(--color-bg-button)` sur la `div` de chaque ligne. La ligne entière change de fond au survol.

### Édition inline

Au survol de la ligne : icône crayon (`PencilSimple`) apparaît (opacity-0 → opacity-100 au survol via `group/group-hover`).

Clic sur le crayon → le libellé passe en `<input>` pré-rempli avec le texte actuel, focus automatique, texte sélectionné.

- `Entrée` ou blur → `updateKeyword` mutation → `invalidateQueries(queryKeys.keywords)` → toast succès
- `Échap` → annulation, retour au texte
- Doublon détecté par l'API → toast erreur

État local par ligne : `editingId: number | null` dans le composant parent.

### Suppression protégée

- `citation_count > 0` → corbeille grisée (`opacity-40 cursor-not-allowed`) + badge inline "N entrées" cliquable
- `citation_count === 0` → corbeille active comme avant (confirm → delete)
- Clic sur le badge → `getKeywordUsages` déclenché (query `enabled` → `true` à la demande) → panel déroulant sous la ligne avec la liste des titres (texte tronqué à 80 chars)
- Panel se referme au clic sur le badge ou sur un bouton "Fermer"

État local : `openUsagesId: number | null` dans le composant parent.

---

## Tests

- Vitest : mise à jour du mock `findKeywords` avec `citation_count`
- Test : crayon visible au survol → input → Entrée → `updateKeyword` appelé
- Test : badge "N entrées" visible si `citation_count > 0`
- Test : clic badge → `getKeywordUsages` appelé
- Test : corbeille active si `citation_count === 0` → confirm → `deleteKeyword` appelé
- PHP `dal_delete_keyword` : vérification du count avant suppression

---

## Ce qui n'est PAS fait

- Lien cliquable vers les citations (la page citations admin ne supporte pas encore de filtre par mot-clé)
- Pagination des usages (limité à 50)
