# T13 — Recherche basique + filtres Œuvre/Thème — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activer la recherche plein-texte et les filtres multi-valeurs Œuvre/Thème dans la sidebar, et afficher les résultats filtrés dans la liste de cartes.

**Architecture:** Un contexte React (`CorpusSearchProvider`) enveloppe `MainLayout` et détient l'état de recherche/filtres + l'appel serveur débouncé ; la `Sidebar` écrit dedans, `AccueilPage` lit les résultats. Côté serveur, la DAL des citations est étendue pour accepter une **liste** d'œuvres/thèmes (`IN (...)`). La hiérarchie des thèmes est résolue côté front (le parent est « déplié » en ses enfants avant l'envoi).

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind, Vitest + Testing Library, PHP 8.1 (PDO), Phosphor Icons.

## Global Constraints

- UI labels **français** avec accents corrects ; identifiants techniques **anglais**.
- PDO **paramètres liés uniquement**, jamais de concaténation d'entrée client (security/database rules).
- Tout SELECT garde `deleted_at IS NULL` et `role_oeuvre_access` (helpers existants `dal_soft_delete_clause`, `dal_oeuvre_access_clause`) — **ne pas y toucher**.
- Debounce recherche : **~500 ms**.
- Pagination : première page (`PAGE_SIZE_DEFAULT = 50`) ; pas de « charger plus » (→ T18).
- Commits : Conventional Commits, en français. **Ne pas pousser** ni committer sans demande explicite du chef de projet → ici on s'arrête à `git add`/`commit` local par tâche, pas de `push`.
- Quality gate par tâche front : `pnpm lint`, `pnpm test`, `pnpm build`. Par tâche PHP : `php -l`.
- Alias d'import : `@/` → `src/`.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `api/dal/citations.php` (modif) | Ajout du filtre multi-valeurs `IN (...)` pour œuvres/thèmes |
| `api/endpoints/citations.php` (modif) | Lecture des paramètres `oeuvre_ids` / `theme_ids` |
| `src/hooks/useDebouncedValue.ts` (create) | Debounce générique réutilisable |
| `src/features/corpus/types.ts` (create) | Types partagés (Oeuvre, Theme, ThemeNode, Citation, CorpusFilters, CheckState) |
| `src/features/corpus/themeSelection.ts` (create) | Fonctions pures : arbre des thèmes + toggle + état de case |
| `src/features/corpus/buildCitationParams.ts` (create) | Construction des paramètres de requête |
| `src/features/corpus/CorpusSearchProvider.tsx` (create) | Contexte : état + référentiels + fetch débouncé |
| `src/features/corpus/useCorpusSearch.ts` (create) | Hook de consommation du contexte |
| `src/components/Sidebar.tsx` (modif) | Champ de recherche actif + filtres Œuvres/Thèmes + Réinitialiser |
| `src/features/accueil/AccueilPage.tsx` (modif) | Consomme `useCorpusSearch()` |
| `src/layouts/MainLayout.tsx` (modif) | Enveloppe avec `CorpusSearchProvider` |
| `src/__tests__/smoke.test.tsx` (modif) | Mock api complété (`findOeuvres`, `findThemes`) |

---

## Task 1: Serveur — filtre multi-valeurs œuvres/thèmes

**Files:**
- Modify: `api/dal/citations.php`
- Modify: `api/endpoints/citations.php`

**Interfaces:**
- Produces: l'endpoint `GET /api/citations` accepte `oeuvre_ids` et `theme_ids` (listes séparées par virgules) en plus des paramètres existants, pour les deux modes (avec `q` et sans `q`).

- [ ] **Step 1: Ajouter le helper privé `_dal_apply_id_list_filter`**

Dans `api/dal/citations.php`, ajouter cette fonction privée juste avant `// --- Private helpers ---` (vers la ligne 440) :

```php
/**
 * Append an "AND col IN (...)" clause from a list of ids, with bound params.
 * Ignores empty/zero ids. No client input is concatenated.
 */
function _dal_apply_id_list_filter(string &$where, array &$params, string $col, string $prefix, mixed $value): void
{
    if (empty($value) || !is_array($value)) {
        return;
    }
    $ids = array_values(array_filter(array_map('intval', $value), static fn (int $v): bool => $v > 0));
    if (empty($ids)) {
        return;
    }
    $placeholders = [];
    foreach ($ids as $i => $id) {
        $key = ":{$prefix}_{$i}";
        $placeholders[] = $key;
        $params[$key] = $id;
    }
    $where .= " AND {$col} IN (" . implode(',', $placeholders) . ')';
}
```

- [ ] **Step 2: Brancher le helper dans `dal_find_citations`**

Dans `dal_find_citations`, juste après le bloc du filtre `theme_id` (après la ligne `$params[':f_theme_id'] = (int) $filters['theme_id'];` et son `}`), ajouter :

```php
    _dal_apply_id_list_filter($where, $params, 'c.oeuvre_id', 'oin', $filters['oeuvre_ids'] ?? null);
    _dal_apply_id_list_filter($where, $params, 'c.theme_id', 'tin', $filters['theme_ids'] ?? null);
```

- [ ] **Step 3: Brancher le helper dans `dal_search_citations`**

Dans `dal_search_citations`, au même endroit (juste après le bloc filtre `theme_id`), ajouter les deux mêmes lignes :

```php
    _dal_apply_id_list_filter($where, $params, 'c.oeuvre_id', 'oin', $filters['oeuvre_ids'] ?? null);
    _dal_apply_id_list_filter($where, $params, 'c.theme_id', 'tin', $filters['theme_ids'] ?? null);
```

- [ ] **Step 4: Lire les nouveaux paramètres dans l'endpoint**

Dans `api/endpoints/citations.php`, dans le tableau `array_filter([...])` de la **branche recherche** (`isset($_GET['q'])`, lignes ~12-21) ET de la **branche liste** (`$method === 'GET' && $id === null`, lignes ~34-43), ajouter ces deux entrées au tableau de filtres :

```php
                'oeuvre_ids'   => isset($_GET['oeuvre_ids']) ? explode(',', $_GET['oeuvre_ids']) : null,
                'theme_ids'    => isset($_GET['theme_ids']) ? explode(',', $_GET['theme_ids']) : null,
```

- [ ] **Step 5: Vérifier la syntaxe PHP**

Run: `php -l api/dal/citations.php && php -l api/endpoints/citations.php`
Expected: `No syntax errors detected` pour les deux fichiers.

- [ ] **Step 6: Vérification manuelle de l'API (documentée)**

Avec une session éditeur active, vérifier dans le navigateur / via curl que ces requêtes répondent en `status: ok` et filtrent correctement (remplacer les ids par des ids réels du seed) :

```
GET /api/citations?oeuvre_ids=1,2
GET /api/citations?theme_ids=3
GET /api/citations?q=ame&oeuvre_ids=1,2&theme_ids=3
```
Attendu : seules les citations des œuvres 1 **ou** 2 (et thèmes demandés) reviennent ; le filtrage par droits reste appliqué (un Abo3 ne reçoit que ses œuvres).

- [ ] **Step 7: Commit**

```bash
git add api/dal/citations.php api/endpoints/citations.php
git commit -m "feat(T13): filtres multi-valeurs œuvres/thèmes dans la DAL citations"
```

---

## Task 2: Hook `useDebouncedValue`

**Files:**
- Create: `src/hooks/useDebouncedValue.ts`
- Test: `src/__tests__/useDebouncedValue.test.ts`

**Interfaces:**
- Produces: `useDebouncedValue<T>(value: T, delayMs: number): T` — retourne la valeur initiale immédiatement, puis la dernière valeur `delayMs` après le dernier changement.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/__tests__/useDebouncedValue.test.ts` :

```ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebouncedValue', () => {
  it('retourne la valeur initiale immédiatement', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 500))
    expect(result.current).toBe('a')
  })

  it('met à jour seulement après le délai', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 500), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'b' })
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(499))
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('b')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `pnpm test -- useDebouncedValue`
Expected: FAIL (`Failed to resolve import '@/hooks/useDebouncedValue'`).

- [ ] **Step 3: Implémenter le hook**

Créer `src/hooks/useDebouncedValue.ts` :

```ts
import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `pnpm test -- useDebouncedValue`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDebouncedValue.ts src/__tests__/useDebouncedValue.test.ts
git commit -m "feat(T13): hook useDebouncedValue"
```

---

## Task 3: Types + sélection des thèmes (fonctions pures)

**Files:**
- Create: `src/features/corpus/types.ts`
- Create: `src/features/corpus/themeSelection.ts`
- Test: `src/features/corpus/__tests__/themeSelection.test.ts`

**Interfaces:**
- Produces (`types.ts`) :
  - `Oeuvre = { id: number; nom: string; auteur_nom: string | null }`
  - `Theme = { id: number; nom: string; parent_id: number | null }`
  - `ThemeNode = { id: number; nom: string; children: Theme[] }`
  - `CheckState = 'checked' | 'indeterminate' | 'unchecked'`
  - `CorpusFilters = { query: string; oeuvreIds: number[]; themeIds: number[] }`
  - `Citation = { id: number; contenu: string; oeuvre_nom: string | null; auteur_nom: string | null; theme_nom: string | null; notes: string | null; mots_cles: { id: number; mot: string }[] }`
- Produces (`themeSelection.ts`) :
  - `buildThemeTree(themes: Theme[]): ThemeNode[]`
  - `toggleThemeNode(selected: number[], tree: ThemeNode[], id: number): number[]`
  - `getThemeCheckState(selected: number[], tree: ThemeNode[], id: number): CheckState`

- [ ] **Step 1: Créer le fichier de types**

Créer `src/features/corpus/types.ts` :

```ts
export type Oeuvre = { id: number; nom: string; auteur_nom: string | null }

export type Theme = { id: number; nom: string; parent_id: number | null }

export type ThemeNode = { id: number; nom: string; children: Theme[] }

export type CheckState = 'checked' | 'indeterminate' | 'unchecked'

export type CorpusFilters = { query: string; oeuvreIds: number[]; themeIds: number[] }

export type Citation = {
  id: number
  contenu: string
  oeuvre_nom: string | null
  auteur_nom: string | null
  theme_nom: string | null
  notes: string | null
  mots_cles: { id: number; mot: string }[]
}
```

- [ ] **Step 2: Écrire les tests qui échouent**

Créer `src/features/corpus/__tests__/themeSelection.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import {
  buildThemeTree,
  toggleThemeNode,
  getThemeCheckState,
} from '@/features/corpus/themeSelection'
import type { Theme } from '@/features/corpus/types'

// Spiritualité(1) > Méditation(2), Prière(3) ; Amour(4) sans enfant
const THEMES: Theme[] = [
  { id: 1, nom: 'Spiritualité', parent_id: null },
  { id: 2, nom: 'Méditation', parent_id: 1 },
  { id: 3, nom: 'Prière', parent_id: 1 },
  { id: 4, nom: 'Amour', parent_id: null },
]
const TREE = buildThemeTree(THEMES)

describe('buildThemeTree', () => {
  it('regroupe enfants sous parents et garde les racines sans enfant', () => {
    expect(TREE).toHaveLength(2)
    expect(TREE[0]).toMatchObject({ id: 1, nom: 'Spiritualité' })
    expect(TREE[0].children.map((c) => c.id)).toEqual([2, 3])
    expect(TREE[1].children).toEqual([])
  })
})

describe('toggleThemeNode', () => {
  it('cocher un parent sélectionne le parent et tous ses enfants', () => {
    expect(toggleThemeNode([], TREE, 1).sort()).toEqual([1, 2, 3])
  })
  it('re-cocher un parent entièrement sélectionné désélectionne tout le groupe', () => {
    expect(toggleThemeNode([1, 2, 3], TREE, 1)).toEqual([])
  })
  it('décocher un enfant retire seulement cet enfant (parent reste)', () => {
    expect(toggleThemeNode([1, 2, 3], TREE, 2).sort()).toEqual([1, 3])
  })
  it('cocher un thème racine sans enfant ne touche que lui', () => {
    expect(toggleThemeNode([], TREE, 4)).toEqual([4])
  })
})

describe('getThemeCheckState', () => {
  it('parent entièrement sélectionné = checked', () => {
    expect(getThemeCheckState([1, 2, 3], TREE, 1)).toBe('checked')
  })
  it('parent partiellement sélectionné = indeterminate', () => {
    expect(getThemeCheckState([1, 3], TREE, 1)).toBe('indeterminate')
  })
  it('parent non sélectionné = unchecked', () => {
    expect(getThemeCheckState([], TREE, 1)).toBe('unchecked')
  })
  it('enfant sélectionné = checked', () => {
    expect(getThemeCheckState([1, 2, 3], TREE, 2)).toBe('checked')
  })
})
```

- [ ] **Step 3: Lancer les tests pour vérifier l'échec**

Run: `pnpm test -- themeSelection`
Expected: FAIL (`Failed to resolve import '@/features/corpus/themeSelection'`).

- [ ] **Step 4: Implémenter les fonctions pures**

Créer `src/features/corpus/themeSelection.ts` :

```ts
import type { Theme, ThemeNode, CheckState } from './types'

export function buildThemeTree(themes: Theme[]): ThemeNode[] {
  return themes
    .filter((t) => t.parent_id === null)
    .map((root) => ({
      id: root.id,
      nom: root.nom,
      children: themes.filter((t) => t.parent_id === root.id),
    }))
}

/** Ids of a node's "group": the node itself plus its direct children (if any). */
function groupIds(tree: ThemeNode[], id: number): number[] {
  const node = tree.find((n) => n.id === id)
  return node ? [node.id, ...node.children.map((c) => c.id)] : [id]
}

export function toggleThemeNode(selected: number[], tree: ThemeNode[], id: number): number[] {
  const set = new Set(selected)
  const node = tree.find((n) => n.id === id)
  // Child or leaf root: toggle just this id.
  if (!node || node.children.length === 0) {
    set.has(id) ? set.delete(id) : set.add(id)
    return [...set]
  }
  // Parent with children: select-all / deselect-all the group.
  const ids = groupIds(tree, id)
  const allSelected = ids.every((i) => set.has(i))
  ids.forEach((i) => (allSelected ? set.delete(i) : set.add(i)))
  return [...set]
}

export function getThemeCheckState(selected: number[], tree: ThemeNode[], id: number): CheckState {
  const set = new Set(selected)
  const node = tree.find((n) => n.id === id)
  if (!node || node.children.length === 0) {
    return set.has(id) ? 'checked' : 'unchecked'
  }
  const ids = [node.id, ...node.children.map((c) => c.id)]
  const count = ids.filter((i) => set.has(i)).length
  if (count === 0) return 'unchecked'
  if (count === ids.length) return 'checked'
  return 'indeterminate'
}
```

- [ ] **Step 5: Lancer les tests pour vérifier le succès**

Run: `pnpm test -- themeSelection`
Expected: PASS (tous les `describe`).

- [ ] **Step 6: Commit**

```bash
git add src/features/corpus/types.ts src/features/corpus/themeSelection.ts src/features/corpus/__tests__/themeSelection.test.ts
git commit -m "feat(T13): types corpus + logique de sélection des thèmes"
```

---

## Task 4: `buildCitationParams`

**Files:**
- Create: `src/features/corpus/buildCitationParams.ts`
- Test: `src/features/corpus/__tests__/buildCitationParams.test.ts`

**Interfaces:**
- Consumes: `CorpusFilters` (Task 3).
- Produces: `buildCitationParams(f: CorpusFilters): Record<string, string>` — omet les clés vides ; `q` (trim), `oeuvre_ids` et `theme_ids` (listes triées jointes par virgule).

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/features/corpus/__tests__/buildCitationParams.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { buildCitationParams } from '@/features/corpus/buildCitationParams'

describe('buildCitationParams', () => {
  it('omet tout quand rien n’est rempli', () => {
    expect(buildCitationParams({ query: '   ', oeuvreIds: [], themeIds: [] })).toEqual({})
  })
  it('inclut q nettoyé', () => {
    expect(buildCitationParams({ query: '  âme ', oeuvreIds: [], themeIds: [] })).toEqual({
      q: 'âme',
    })
  })
  it('joint et trie les ids', () => {
    expect(
      buildCitationParams({ query: '', oeuvreIds: [2, 1], themeIds: [5, 3, 4] }),
    ).toEqual({ oeuvre_ids: '1,2', theme_ids: '3,4,5' })
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `pnpm test -- buildCitationParams`
Expected: FAIL (import non résolu).

- [ ] **Step 3: Implémenter**

Créer `src/features/corpus/buildCitationParams.ts` :

```ts
import type { CorpusFilters } from './types'

export function buildCitationParams(f: CorpusFilters): Record<string, string> {
  const params: Record<string, string> = {}
  const q = f.query.trim()
  if (q) params.q = q
  if (f.oeuvreIds.length) params.oeuvre_ids = [...f.oeuvreIds].sort((a, b) => a - b).join(',')
  if (f.themeIds.length) params.theme_ids = [...f.themeIds].sort((a, b) => a - b).join(',')
  return params
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `pnpm test -- buildCitationParams`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/corpus/buildCitationParams.ts src/features/corpus/__tests__/buildCitationParams.test.ts
git commit -m "feat(T13): construction des paramètres de recherche citations"
```

---

## Task 5: `CorpusSearchProvider` + `useCorpusSearch`

**Files:**
- Create: `src/features/corpus/CorpusSearchProvider.tsx`
- Create: `src/features/corpus/useCorpusSearch.ts`
- Test: `src/features/corpus/__tests__/CorpusSearchProvider.test.tsx`

**Interfaces:**
- Consumes: `useDebouncedValue` (Task 2) ; `buildThemeTree`, `toggleThemeNode` (Task 3) ; `buildCitationParams` (Task 4) ; `apiClient.findOeuvres`, `apiClient.findThemes`, `apiClient.findCitations` (existants).
- Produces:
  - `CorpusSearchContext` (React context) et `CorpusSearchProvider` (composant).
  - `useCorpusSearch(): CorpusSearchContextValue` avec les champs : `query`, `setQuery(q)`, `oeuvres`, `themeTree`, `selectedOeuvreIds`, `selectedThemeIds`, `toggleOeuvre(id)`, `toggleTheme(id)`, `reset()`, `items`, `loading`, `error`, `hasMore`, `hasActiveFilters`.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/features/corpus/__tests__/CorpusSearchProvider.test.tsx` :

```tsx
import { render, screen, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CorpusSearchProvider } from '@/features/corpus/CorpusSearchProvider'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'

vi.mock('@/services/api', () => ({
  apiClient: {
    findOeuvres: vi.fn().mockResolvedValue({ status: 'ok', data: [], errors: [] }),
    findThemes: vi.fn().mockResolvedValue({ status: 'ok', data: [], errors: [] }),
    findCitations: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { items: [], next_cursor: null }, errors: [] }),
  },
}))

import { apiClient } from '@/services/api'

function Probe() {
  const { setQuery, loading } = useCorpusSearch()
  return (
    <div>
      <span>{loading ? 'loading' : 'idle'}</span>
      <button onClick={() => setQuery('âme')}>chercher</button>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('CorpusSearchProvider', () => {
  it('charge les citations au montage', async () => {
    render(
      <CorpusSearchProvider>
        <Probe />
      </CorpusSearchProvider>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(apiClient.findCitations).toHaveBeenCalledWith({})
  })

  it('relance une recherche débouncée avec q après saisie', async () => {
    render(
      <CorpusSearchProvider>
        <Probe />
      </CorpusSearchProvider>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    act(() => screen.getByText('chercher').click())
    act(() => vi.advanceTimersByTime(500))
    await waitFor(() => expect(apiClient.findCitations).toHaveBeenLastCalledWith({ q: 'âme' }))
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `pnpm test -- CorpusSearchProvider`
Expected: FAIL (import non résolu).

- [ ] **Step 3: Implémenter le provider**

Créer `src/features/corpus/CorpusSearchProvider.tsx` :

```tsx
import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { apiClient } from '@/services/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { buildThemeTree, toggleThemeNode } from './themeSelection'
import { buildCitationParams } from './buildCitationParams'
import type { Citation, Oeuvre, Theme, ThemeNode } from './types'

export type CorpusSearchContextValue = {
  query: string
  setQuery: (q: string) => void
  oeuvres: Oeuvre[]
  themeTree: ThemeNode[]
  selectedOeuvreIds: number[]
  selectedThemeIds: number[]
  toggleOeuvre: (id: number) => void
  toggleTheme: (id: number) => void
  reset: () => void
  items: Citation[]
  loading: boolean
  error: string | null
  hasMore: boolean
  hasActiveFilters: boolean
}

export const CorpusSearchContext = createContext<CorpusSearchContextValue | null>(null)

export function CorpusSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('')
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([])
  const [themes, setThemes] = useState<Theme[]>([])
  const [selectedOeuvreIds, setSelectedOeuvreIds] = useState<number[]>([])
  const [selectedThemeIds, setSelectedThemeIds] = useState<number[]>([])
  const [items, setItems] = useState<Citation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const themeTree = useMemo(() => buildThemeTree(themes), [themes])

  // Référentiels chargés une fois.
  useEffect(() => {
    apiClient.findOeuvres().then((res) => {
      if (res.status === 'ok' && res.data) setOeuvres(res.data as Oeuvre[])
    })
    apiClient.findThemes().then((res) => {
      if (res.status === 'ok' && res.data) setThemes(res.data as Theme[])
    })
  }, [])

  // Clé primitive débouncée (évite de réarmer le timer à chaque rendu).
  const filtersKey =
    query.trim() +
    ' ' +
    [...selectedOeuvreIds].sort((a, b) => a - b).join(',') +
    ' ' +
    [...selectedThemeIds].sort((a, b) => a - b).join(',')
  const debouncedKey = useDebouncedValue(filtersKey, 500)

  // Valeurs courantes lues au moment du fetch (cohérentes avec la clé débouncée).
  const filtersRef = useRef({ query, selectedOeuvreIds, selectedThemeIds })
  filtersRef.current = { query, selectedOeuvreIds, selectedThemeIds }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const { query: q, selectedOeuvreIds: oi, selectedThemeIds: ti } = filtersRef.current
    apiClient
      .findCitations(buildCitationParams({ query: q, oeuvreIds: oi, themeIds: ti }))
      .then((res) => {
        if (cancelled) return
        if (res.status === 'ok' && res.data) {
          setItems(res.data.items as Citation[])
          setHasMore(res.data.next_cursor !== null)
        } else {
          setError(res.errors?.[0] ?? 'Erreur de chargement')
        }
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de contacter le serveur')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedKey])

  const value: CorpusSearchContextValue = {
    query,
    setQuery,
    oeuvres,
    themeTree,
    selectedOeuvreIds,
    selectedThemeIds,
    toggleOeuvre: (id) =>
      setSelectedOeuvreIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      ),
    toggleTheme: (id) => setSelectedThemeIds((prev) => toggleThemeNode(prev, themeTree, id)),
    reset: () => {
      setQuery('')
      setSelectedOeuvreIds([])
      setSelectedThemeIds([])
    },
    items,
    loading,
    error,
    hasMore,
    hasActiveFilters:
      query.trim() !== '' || selectedOeuvreIds.length > 0 || selectedThemeIds.length > 0,
  }

  return <CorpusSearchContext.Provider value={value}>{children}</CorpusSearchContext.Provider>
}
```

- [ ] **Step 4: Implémenter le hook**

Créer `src/features/corpus/useCorpusSearch.ts` :

```ts
import { useContext } from 'react'
import { CorpusSearchContext, type CorpusSearchContextValue } from './CorpusSearchProvider'

export function useCorpusSearch(): CorpusSearchContextValue {
  const ctx = useContext(CorpusSearchContext)
  if (!ctx) {
    throw new Error('useCorpusSearch doit être utilisé dans un CorpusSearchProvider')
  }
  return ctx
}
```

- [ ] **Step 5: Lancer le test pour vérifier le succès**

Run: `pnpm test -- CorpusSearchProvider`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/corpus/CorpusSearchProvider.tsx src/features/corpus/useCorpusSearch.ts src/features/corpus/__tests__/CorpusSearchProvider.test.tsx
git commit -m "feat(T13): contexte de recherche corpus (état + fetch débouncé)"
```

---

## Task 6: Réécriture de la `Sidebar` (recherche + filtres actifs)

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Test: `src/components/__tests__/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `useCorpusSearch` (Task 5), `getThemeCheckState` (Task 3).
- Produces: une `Sidebar` qui rend un champ de recherche actif, les filtres Œuvres (cases) et Thèmes (arborescence tri-état), un emplacement Mots-clés « À venir », et un bouton Réinitialiser conditionnel.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/components/__tests__/Sidebar.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Sidebar } from '../Sidebar'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'
import type { CorpusSearchContextValue } from '@/features/corpus/CorpusSearchProvider'

vi.mock('@/features/corpus/useCorpusSearch', () => ({ useCorpusSearch: vi.fn() }))

function mockSearch(over: Partial<CorpusSearchContextValue> = {}) {
  const base: CorpusSearchContextValue = {
    query: '',
    setQuery: vi.fn(),
    oeuvres: [{ id: 1, nom: 'Évangiles', auteur_nom: 'Anonyme' }],
    themeTree: [{ id: 10, nom: 'Spiritualité', children: [{ id: 11, nom: 'Prière', parent_id: 10 }] }],
    selectedOeuvreIds: [],
    selectedThemeIds: [],
    toggleOeuvre: vi.fn(),
    toggleTheme: vi.fn(),
    reset: vi.fn(),
    items: [],
    loading: false,
    error: null,
    hasMore: false,
    hasActiveFilters: false,
    ...over,
  }
  vi.mocked(useCorpusSearch).mockReturnValue(base)
  return base
}

describe('Sidebar', () => {
  it('le champ de recherche est actif et reflète la valeur', () => {
    mockSearch({ query: 'âme' })
    render(<Sidebar />)
    const input = screen.getByLabelText('Rechercher dans le contenu') as HTMLInputElement
    expect(input).not.toBeDisabled()
    expect(input.value).toBe('âme')
  })

  it('affiche les œuvres et thèmes (parent + enfant)', () => {
    mockSearch()
    render(<Sidebar />)
    expect(screen.getByLabelText('Évangiles')).toBeInTheDocument()
    expect(screen.getByLabelText('Spiritualité')).toBeInTheDocument()
    expect(screen.getByLabelText('Prière')).toBeInTheDocument()
  })

  it('le bouton Réinitialiser n’apparaît que si des filtres sont actifs', () => {
    mockSearch({ hasActiveFilters: false })
    const { rerender } = render(<Sidebar />)
    expect(screen.queryByRole('button', { name: 'Réinitialiser' })).toBeNull()
    mockSearch({ hasActiveFilters: true })
    rerender(<Sidebar />)
    expect(screen.getByRole('button', { name: 'Réinitialiser' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `pnpm test -- Sidebar`
Expected: FAIL (l'ancienne Sidebar n'a pas de champ labellisé `Rechercher dans le contenu`, les œuvres ne sont pas rendues).

- [ ] **Step 3: Réécrire la Sidebar**

Remplacer **tout** le contenu de `src/components/Sidebar.tsx` par :

```tsx
// src/components/Sidebar.tsx
import { useEffect, useRef, type InputHTMLAttributes } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'
import { getThemeCheckState } from '@/features/corpus/themeSelection'
import type { CheckState } from '@/features/corpus/types'

type TriProps = { state: CheckState } & Omit<InputHTMLAttributes<HTMLInputElement>, 'checked'>

function TriCheckbox({ state, ...props }: TriProps) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'indeterminate'
  }, [state])
  return <input ref={ref} type="checkbox" checked={state === 'checked'} {...props} />
}

const sectionTitle = 'mb-1 text-xs font-semibold uppercase text-(--color-text-secondary)'
const rowLabel = 'flex items-center gap-2 py-0.5 text-sm text-(--color-text-primary)'

export function Sidebar() {
  const {
    query,
    setQuery,
    oeuvres,
    themeTree,
    selectedOeuvreIds,
    selectedThemeIds,
    toggleOeuvre,
    toggleTheme,
    reset,
    hasActiveFilters,
  } = useCorpusSearch()

  return (
    <aside className="w-full shrink-0 border-b border-(--color-border) bg-(--color-bg-sidebar) p-4 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="mb-4">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-placeholder)"
          />
          <input
            type="text"
            aria-label="Rechercher dans le contenu"
            placeholder="Rechercher dans le contenu…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) py-2 pl-9 pr-9 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder)"
          />
          {query && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-(--color-text-placeholder) hover:text-(--color-text-primary)"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="mb-3">
        <h3 className={sectionTitle}>
          Œuvres{selectedOeuvreIds.length ? ` (${selectedOeuvreIds.length})` : ''}
        </h3>
        {oeuvres.length === 0 ? (
          <p className="text-xs text-(--color-text-placeholder)">Aucune œuvre</p>
        ) : (
          <div className="max-h-48 overflow-y-auto pr-1">
            {oeuvres.map((o) => (
              <label key={o.id} className={rowLabel}>
                <input
                  type="checkbox"
                  checked={selectedOeuvreIds.includes(o.id)}
                  onChange={() => toggleOeuvre(o.id)}
                />
                <span>{o.nom}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3">
        <h3 className={sectionTitle}>
          Thèmes{selectedThemeIds.length ? ` (${selectedThemeIds.length})` : ''}
        </h3>
        {themeTree.length === 0 ? (
          <p className="text-xs text-(--color-text-placeholder)">Aucun thème</p>
        ) : (
          <div className="max-h-48 overflow-y-auto pr-1">
            {themeTree.map((parent) => (
              <div key={parent.id}>
                <label className={rowLabel}>
                  <TriCheckbox
                    state={getThemeCheckState(selectedThemeIds, themeTree, parent.id)}
                    aria-label={parent.nom}
                    onChange={() => toggleTheme(parent.id)}
                  />
                  <span>{parent.nom}</span>
                </label>
                {parent.children.map((child) => (
                  <label key={child.id} className={`${rowLabel} pl-5`}>
                    <input
                      type="checkbox"
                      aria-label={child.nom}
                      checked={
                        getThemeCheckState(selectedThemeIds, themeTree, child.id) === 'checked'
                      }
                      onChange={() => toggleTheme(child.id)}
                    />
                    <span>{child.nom}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3">
        <h3 className={sectionTitle}>Mots-clés</h3>
        <p className="text-xs text-(--color-text-placeholder)">À venir</p>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={reset}
          className="mt-1 text-sm text-(--color-accent) hover:underline"
        >
          Réinitialiser
        </button>
      )}
    </aside>
  )
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `pnpm test -- Sidebar`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.tsx src/components/__tests__/Sidebar.test.tsx
git commit -m "feat(T13): sidebar de recherche et filtres Œuvre/Thème actifs"
```

---

## Task 7: Câblage `AccueilPage` + `MainLayout` + mock smoke

**Files:**
- Modify: `src/features/accueil/AccueilPage.tsx`
- Modify: `src/layouts/MainLayout.tsx`
- Modify: `src/__tests__/smoke.test.tsx`

**Interfaces:**
- Consumes: `useCorpusSearch` (Task 5), `CorpusSearchProvider` (Task 5).

- [ ] **Step 1: Brancher `AccueilPage` sur le contexte**

Remplacer **tout** le contenu de `src/features/accueil/AccueilPage.tsx` par :

```tsx
// src/features/accueil/AccueilPage.tsx
import { CitationCard } from '@/components/CitationCard'
import { useAuth } from '@/hooks/useAuth'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'

const ADMIN_ROLES = [1, 2] // Administrateur, Éditeur

export function AccueilPage() {
  const { user } = useAuth()
  const canEdit = user ? ADMIN_ROLES.includes(user.role_id) : false
  const { items, loading, error, hasMore } = useCorpusSearch()

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-(--color-text-secondary)">
          {loading
            ? 'Recherche…'
            : `${items.length} résultat${items.length !== 1 ? 's' : ''}${hasMore ? '+' : ''}`}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-text)">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-(--color-text-placeholder)">Aucune entrée ne correspond.</p>
      )}

      <div className="flex flex-col gap-4">
        {items.map((c) => (
          <CitationCard
            key={c.id}
            contenu={c.contenu}
            oeuvre_nom={c.oeuvre_nom}
            theme_nom={c.theme_nom}
            auteur_nom={c.auteur_nom}
            notes={c.notes}
            mots_cles={(c.mots_cles ?? []).map((k) => k.mot)}
            canEdit={canEdit}
          />
        ))}
      </div>

      {!loading && hasMore && (
        <p className="mt-4 text-center text-xs text-(--color-text-placeholder)">
          Affinez votre recherche pour préciser les résultats.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Envelopper `MainLayout` avec le provider**

Remplacer **tout** le contenu de `src/layouts/MainLayout.tsx` par :

```tsx
// src/layouts/MainLayout.tsx
import { Outlet } from 'react-router'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { CorpusSearchProvider } from '@/features/corpus/CorpusSearchProvider'

export function MainLayout() {
  return (
    <CorpusSearchProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 flex-col lg:flex-row">
          <Sidebar />
          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </CorpusSearchProvider>
  )
}
```

- [ ] **Step 3: Compléter le mock du test smoke**

Dans `src/__tests__/smoke.test.tsx`, le `vi.mock('@/services/api', …)` ne fournit pas encore `findOeuvres`/`findThemes` (appelés par le provider). Ajouter ces deux clés dans l'objet `apiClient` du mock :

```ts
    findOeuvres: vi.fn().mockResolvedValue({ status: 'ok', data: [], errors: [] }),
    findThemes: vi.fn().mockResolvedValue({ status: 'ok', data: [], errors: [] }),
```

(les placer à côté de `findCitations` dans le mock).

- [ ] **Step 4: Lancer toute la suite de tests**

Run: `pnpm test`
Expected: PASS — tous les fichiers, y compris `smoke` (qui rend `App` → `MainLayout` → provider + Sidebar).

- [ ] **Step 5: Typecheck + lint + build**

Run: `pnpm tsc --noEmit && pnpm lint && pnpm build`
Expected: aucun, aucune erreur ; build Vite réussi.

- [ ] **Step 6: Vérification manuelle (spot-check)**

Lancer l'app, se connecter en éditeur, et vérifier :
- Taper « ame » → après ~½ s, la liste se filtre (résultats contenant « âme », accents ignorés).
- Cocher deux œuvres → seules leurs citations restent ; le compteur se met à jour.
- Cocher un thème parent → ses sous-thèmes se cochent ; décocher un sous-thème → le parent passe en case « partielle ».
- « Réinitialiser » vide recherche + filtres.
- Réduire la fenêtre (mobile) : la sidebar passe en haut, champ + en-têtes restent visibles, listes défilables.

- [ ] **Step 7: Commit**

```bash
git add src/features/accueil/AccueilPage.tsx src/layouts/MainLayout.tsx src/__tests__/smoke.test.tsx
git commit -m "feat(T13): brancher la liste sur la recherche/filtres + provider dans le layout"
```

---

## Post-implémentation (hors tâches de code)

- [ ] Mettre à jour `docs/1-trame_execution-lumosphere.md` (statut T13) **après validation** du chef de projet — barrer `T13` comme T10–T12 (`~T13~`), uniquement sur sign-off.
- [ ] Mettre à jour le devbook `docs/3-devbook_developpement-lumosphere.md` (case « Recherche/filtres minimaux » de la Phase II) après validation.

## Self-review (couverture spec)

- Recherche plein-texte débouncée ~500 ms → Tasks 2, 5, 6. ✓
- Filtres Œuvre/Thème multi-valeurs (auteur retiré) → Tasks 1 (serveur), 5, 6. ✓
- Thèmes parent/enfant avec sous-thèmes décochables → Task 3 (+ rendu Task 6). ✓
- Sidebar conservée, listes plafonnées pour petit écran → Task 6 (`max-h-48 overflow-y-auto`). ✓
- Contexte partagé reliant sidebar et résultats → Tasks 5, 7. ✓
- Cumul recherche + œuvres + thèmes, Réinitialiser → Tasks 4, 5, 6. ✓
- Pagination première page + note « affinez » → Task 7. ✓
- Droits/soft-delete inchangés → Task 1 (helpers existants réutilisés). ✓
- Tests unitaires + accessibilité (labels, focus, tri-état `aria`) → Tasks 2-6. ✓
- Hors périmètre (mots-clés ET/OU, charger plus, virtualisation, badges, URL) → non implémenté, section Mots-clés « À venir ». ✓
```
