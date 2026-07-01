# Perfectionnement de la sidebar de filtrage — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la sidebar de filtrage de la bibliothèque entièrement visible (pied fixe qui ne déborde jamais de l'écran), avec un bouton Réinitialiser toujours affiché (grisé si aucun filtre actif) et un toggle OU/ET mots-clés toujours visible.

**Architecture:** Changement 100% frontend, aucun changement serveur ni de types de filtres. `CorpusFilters.tsx` perd son bouton Réinitialiser (déplacé) et affiche son toggle mots-clés sans condition. `Sidebar.tsx` passe d'un simple wrapper à un layout flex à 2 zones : un corps défilant (qui contient `<CorpusFilters />`) et un pied fixe (bouton Réinitialiser + crédit Lulumineuse), tous deux consommant `useCorpusSearch()`.

**Tech Stack:** React 19 + TypeScript + Tailwind CSS v4 (syntaxe `bg-(--color-x)`), Vitest + Testing Library, Playwright.

## Global Constraints

- UI labels en français avec accents corrects ; identifiants techniques en anglais.
- Ne pas toucher aux types `CorpusFilters` (`types.ts`), à `useUrlFilterState.ts`, à `buildCitationParams.ts` ni au serveur PHP — hors périmètre (cf. décisions de conception, spec `docs/superpowers/specs/2026-07-01-sidebar-filtrage-design.md`).
- Pas de mode « ET » pour les œuvres ni pour les thèmes (une citation a une seule œuvre et un seul thème — limitation structurelle du schéma).
- `pnpm lint`, `pnpm build`, `pnpm tsc --noEmit` doivent passer avant de considérer une tâche terminée.
- Commit après chaque tâche, message `feat(sidebar): ...` (Conventional Commits) — mentionner l'impact visuel, pas de migration de données ici.

---

### Task 1: CorpusFilters — toggle OU/ET mots-clés toujours visible, retrait du bouton Réinitialiser

**Files:**
- Modify: `src/components/CorpusFilters.tsx`
- Test: `src/components/__tests__/CorpusFilters.test.tsx`

**Interfaces:**
- Consumes: `useCorpusSearch()` (existant, `@/features/corpus/useCorpusSearch`) — aucune signature modifiée.
- Produces: `CorpusFilters` ne rend plus de bouton Réinitialiser (déplacé en Task 2 dans `Sidebar.tsx`, qui consommera directement `reset` et `hasActiveFilters` via son propre appel à `useCorpusSearch()`).

Note pour l'exécutant : après cette tâche, le bouton Réinitialiser disparaît temporairement de l'écran (il n'existe pas encore ailleurs). C'est normal et attendu — il réapparaît dans le pied fixe à la Task 2. Ne pas s'inquiéter d'un « recul » fonctionnel entre ces deux commits.

- [ ] **Step 1: Modifier le test existant du bouton Réinitialiser (il n'est plus rendu par ce composant)**

Dans `src/components/__tests__/CorpusFilters.test.tsx`, remplacer le test :

```tsx
  it('bouton Réinitialiser visible uniquement si hasActiveFilters est vrai', () => {
    vi.mocked(useCorpusSearch).mockReturnValue(makeSearch({ hasActiveFilters: false }))
    const { rerender } = render(<CorpusFilters />)
    expect(screen.queryByRole('button', { name: /réinitialiser/i })).not.toBeInTheDocument()

    vi.mocked(useCorpusSearch).mockReturnValue(makeSearch({ hasActiveFilters: true }))
    rerender(<CorpusFilters />)
    expect(screen.getByRole('button', { name: /réinitialiser/i })).toBeInTheDocument()
  })
```

par :

```tsx
  it('ne rend plus le bouton Réinitialiser (déplacé dans le pied de la Sidebar)', () => {
    vi.mocked(useCorpusSearch).mockReturnValue(makeSearch({ hasActiveFilters: true }))
    render(<CorpusFilters />)
    expect(screen.queryByRole('button', { name: /réinitialiser/i })).not.toBeInTheDocument()
  })

  it('mode OU/ET des mots-clés visible même sans mot-clé sélectionné', () => {
    vi.mocked(useCorpusSearch).mockReturnValue(
      makeSearch({ keywords: [{ id: 1, mot: 'paix' }], keywordIds: [] }),
    )
    render(<CorpusFilters />)
    expect(screen.getByRole('button', { name: 'OU' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ET' })).toBeInTheDocument()
  })
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent (le composant rend encore l'ancien comportement)**

Run: `pnpm vitest run src/components/__tests__/CorpusFilters.test.tsx`
Expected: FAIL — le nouveau test « ne rend plus le bouton Réinitialiser » échoue car le bouton est encore rendu (condition `hasActiveFilters` vraie dans le mock) ; le test « mode OU/ET » échoue aussi car le toggle est encore conditionné à `keywordIds.length >= 1`.

- [ ] **Step 3: Retirer la condition d'affichage du toggle OU/ET mots-clés**

Dans `src/components/CorpusFilters.tsx`, remplacer (lignes ~172-213) :

```tsx
        ) : (
          <>
            <div className="max-h-48 overflow-y-auto pr-1">
              {keywords.map((k) => (
                <label key={k.id} className={rowLabel}>
                  <input
                    type="checkbox"
                    aria-label={k.mot}
                    checked={keywordIds.includes(k.id)}
                    onChange={() => toggleKeyword(k.id)}
                  />
                  <span>{k.mot}</span>
                </label>
              ))}
            </div>
            {keywordIds.length >= 1 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-(--color-text-secondary)">Mode :</span>
                <button
                  type="button"
                  onClick={() => setKeywordMode('OR')}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    keywordMode === 'OR'
                      ? 'bg-(--color-action) text-(--color-action-text)'
                      : 'bg-(--color-bg-sidebar) text-(--color-text-secondary) hover:bg-(--color-bg-button)'
                  }`}
                >
                  OU
                </button>
                <button
                  type="button"
                  onClick={() => setKeywordMode('AND')}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    keywordMode === 'AND'
                      ? 'bg-(--color-action) text-(--color-action-text)'
                      : 'bg-(--color-bg-sidebar) text-(--color-text-secondary) hover:bg-(--color-bg-button)'
                  }`}
                >
                  ET
                </button>
              </div>
            )}
          </>
        )}
```

par :

```tsx
        ) : (
          <>
            <div className="max-h-48 overflow-y-auto pr-1">
              {keywords.map((k) => (
                <label key={k.id} className={rowLabel}>
                  <input
                    type="checkbox"
                    aria-label={k.mot}
                    checked={keywordIds.includes(k.id)}
                    onChange={() => toggleKeyword(k.id)}
                  />
                  <span>{k.mot}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-(--color-text-secondary)">Mode :</span>
              <button
                type="button"
                onClick={() => setKeywordMode('OR')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  keywordMode === 'OR'
                    ? 'bg-(--color-action) text-(--color-action-text)'
                    : 'bg-(--color-bg-sidebar) text-(--color-text-secondary) hover:bg-(--color-bg-button)'
                }`}
              >
                OU
              </button>
              <button
                type="button"
                onClick={() => setKeywordMode('AND')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  keywordMode === 'AND'
                    ? 'bg-(--color-action) text-(--color-action-text)'
                    : 'bg-(--color-bg-sidebar) text-(--color-text-secondary) hover:bg-(--color-bg-button)'
                }`}
              >
                ET
              </button>
            </div>
          </>
        )}
```

- [ ] **Step 4: Retirer le bouton Réinitialiser et les props devenues inutiles**

Dans `src/components/CorpusFilters.tsx`, retirer le bloc final (lignes ~241-249) :

```tsx
      {hasActiveFilters && (
        <button
          type="button"
          onClick={reset}
          className="mt-1 rounded-sm text-sm font-medium text-(--color-accent-ink) hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
        >
          Réinitialiser
        </button>
      )}
    </>
  )
}
```

remplacer par :

```tsx
    </>
  )
}
```

Puis, dans le même fichier, retirer `reset` et `hasActiveFilters` de la déstructuration de `useCorpusSearch()` (ils ne sont plus utilisés dans ce composant) :

```tsx
  const {
    query,
    setQuery,
    oeuvres,
    themeTree,
    keywords,
    selectedOeuvreIds,
    selectedThemeIds,
    keywordIds,
    keywordMode,
    dateFrom,
    dateTo,
    sort,
    toggleOeuvre,
    toggleTheme,
    toggleKeyword,
    setKeywordMode,
    setDateFrom,
    setDateTo,
    setSort,
  } = useCorpusSearch()
```

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run src/components/__tests__/CorpusFilters.test.tsx`
Expected: PASS (tous les tests du fichier, y compris les 2 nouveaux/modifiés).

- [ ] **Step 6: Vérifier le typecheck et le lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: aucune erreur (notamment aucune variable inutilisée `reset`/`hasActiveFilters` dans `CorpusFilters.tsx`).

- [ ] **Step 7: Commit**

```bash
git add src/components/CorpusFilters.tsx src/components/__tests__/CorpusFilters.test.tsx
git commit -m "feat(sidebar): toggle mots-clés toujours visible, retrait du bouton Réinitialiser de CorpusFilters"
```

---

### Task 2: Sidebar — layout 3 zones (corps défilant + pied fixe avec Réinitialiser et crédit Lulumineuse)

**Files:**
- Create: `src/assets/lulumineuse-logo.png` (copié depuis l'archive de référence locale)
- Modify: `src/assets/README.md`
- Modify: `src/components/Sidebar.tsx`
- Test: `src/components/__tests__/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `useCorpusSearch()` — ajoute `reset: () => void` et `hasActiveFilters: boolean` à la déstructuration existante (`filtersOpen` déjà consommé). Ces deux champs existent déjà dans `CorpusSearchContextValue` (`src/features/corpus/CorpusSearchContext.ts:26,35`), aucune modification de contexte nécessaire.
- Produces: `Sidebar` rend désormais un bouton `role="button" name=/réinitialiser/i` avec l'attribut `disabled` piloté par `!hasActiveFilters`, et un lien `role="link" name=/lulumineuse/i` vers le crédit.

- [ ] **Step 1: Copier le logo Lulumineuse depuis l'archive de référence**

Le logo existe déjà dans l'archive de référence locale (schéma de la démo citée par le chef de projet), à extraire tel quel (PNG 462×462, aucune modification) :

Run:
```bash
unzip -o -j "/home/stef/Documents/Lulu/Archives/Telegram/AIStudio/index-lulu'mineux-v61p.zip" "backend/src/templates/assets/logo.png" -d src/assets
mv src/assets/logo.png src/assets/lulumineuse-logo.png
```

Expected: le fichier `src/assets/lulumineuse-logo.png` existe (vérifier avec `file src/assets/lulumineuse-logo.png` → `PNG image data, 462 x 462`).

- [ ] **Step 2: Documenter l'asset dans le README des assets**

Dans `src/assets/README.md`, ajouter en fin de fichier :

```markdown

## Crédit Lulumineuse (pied de sidebar)

`lulumineuse-logo.png` — logo affiché dans le pied fixe de la sidebar de filtrage (`src/components/Sidebar.tsx`), à côté du lien vers lulumineuse.com. Source : archive de référence locale (backend de la démo Index Lulumineux), copié tel quel.
```

- [ ] **Step 3: Écrire les tests du pied de sidebar (ils doivent échouer avant l'implémentation)**

Dans `src/components/__tests__/Sidebar.test.tsx`, remplacer tout le fichier par :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { Sidebar } from '../Sidebar'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'
import type { CorpusSearchContextValue } from '@/features/corpus/CorpusSearchContext'

vi.mock('@/features/corpus/useCorpusSearch', () => ({ useCorpusSearch: vi.fn() }))

function mockSearch(overrides: Record<string, unknown> = {}) {
  const base = {
    query: '',
    setQuery: vi.fn(),
    oeuvres: [],
    themeTree: [],
    keywords: [],
    selectedOeuvreIds: [],
    selectedThemeIds: [],
    keywordIds: [],
    keywordMode: null,
    dateFrom: '',
    dateTo: '',
    sort: 'date',
    toggleOeuvre: vi.fn(),
    toggleTheme: vi.fn(),
    toggleKeyword: vi.fn(),
    setKeywordMode: vi.fn(),
    setDateFrom: vi.fn(),
    setDateTo: vi.fn(),
    setSort: vi.fn(),
    reset: vi.fn(),
    items: [],
    loading: false,
    error: null,
    hasMore: false,
    loadingMore: false,
    loadMore: vi.fn(),
    hasActiveFilters: false,
    filtersOpen: false,
    toggleFilters: vi.fn(),
    ...overrides,
  } as unknown as CorpusSearchContextValue
  vi.mocked(useCorpusSearch).mockReturnValue(base)
}

function renderAt(path: string, overrides: Record<string, unknown> = {}) {
  mockSearch(overrides)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  it('hors admin : affiche le champ de recherche', () => {
    renderAt('/')
    expect(screen.getByLabelText('Rechercher dans le contenu')).toBeInTheDocument()
  })

  it('en section admin : affiche le menu admin, pas la recherche', () => {
    renderAt('/admin/utilisateurs')
    expect(screen.getByRole('link', { name: /utilisateurs/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /rôles et droits/i })).toBeInTheDocument()
    expect(screen.queryByLabelText('Rechercher dans le contenu')).not.toBeInTheDocument()
  })

  it('hors admin : bouton Réinitialiser toujours présent, désactivé sans filtre actif', () => {
    renderAt('/', { hasActiveFilters: false })
    expect(screen.getByRole('button', { name: /réinitialiser/i })).toBeDisabled()
  })

  it('hors admin : bouton Réinitialiser actif si des filtres sont posés, et déclenche reset', async () => {
    const reset = vi.fn()
    renderAt('/', { hasActiveFilters: true, reset })
    const button = screen.getByRole('button', { name: /réinitialiser/i })
    expect(button).toBeEnabled()
    button.click()
    expect(reset).toHaveBeenCalled()
  })

  it('hors admin : affiche le crédit Lulumineuse dans le pied', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: /lulumineuse/i })).toBeInTheDocument()
  })

  it('en section admin : n\'affiche pas le pied de filtres (Réinitialiser / crédit)', () => {
    renderAt('/admin/utilisateurs')
    expect(screen.queryByRole('button', { name: /réinitialiser/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /lulumineuse/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run src/components/__tests__/Sidebar.test.tsx`
Expected: FAIL sur les 3 nouveaux tests (pas de bouton Réinitialiser ni de lien Lulumineuse rendus par `Sidebar` actuellement).

- [ ] **Step 5: Implémenter le layout 3 zones dans Sidebar.tsx**

Remplacer tout le contenu de `src/components/Sidebar.tsx` par :

```tsx
// src/components/Sidebar.tsx
import { useLocation } from 'react-router'
import { CorpusFilters } from '@/components/CorpusFilters'
import { AdminNav } from '@/components/AdminNav'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'
import lulumineuseLogo from '@/assets/lulumineuse-logo.png'

export function Sidebar() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  const { filtersOpen, reset, hasActiveFilters } = useCorpusSearch()

  if (isAdmin) {
    return (
      <aside className="w-full shrink-0 border-b border-(--color-border) bg-(--color-bg-sidebar) lg:w-80 lg:border-b-0 lg:border-r">
        <div className="p-4 lg:sticky lg:top-16 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
          <AdminNav />
        </div>
      </aside>
    )
  }

  return (
    <aside
      id="corpus-filters"
      className={`w-full shrink-0 border-b border-(--color-border) bg-(--color-bg-sidebar) lg:block lg:w-80 lg:border-b-0 lg:border-r ${
        filtersOpen ? 'block' : 'hidden'
      }`}
    >
      <div className="flex flex-col lg:sticky lg:top-16 lg:max-h-[calc(100vh-4rem)]">
        <div className="flex-grow overflow-y-auto p-4">
          <CorpusFilters />
        </div>
        <div className="flex-shrink-0 border-t border-(--color-border) p-4">
          <button
            type="button"
            onClick={reset}
            disabled={!hasActiveFilters}
            className="w-full rounded-md bg-(--color-action) px-3 py-2 text-sm font-medium text-(--color-action-text) transition-colors hover:bg-(--color-action-hover) disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-(--color-action)"
          >
            Réinitialiser
          </button>
          <a
            href="http://www.lulumineuse.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 text-xs text-(--color-text-secondary) transition-colors hover:text-(--color-action)"
          >
            <img
              src={lulumineuseLogo}
              alt="Logo Lulumineuse"
              className="h-5 w-5 shrink-0 object-contain"
            />
            <span>D&apos;après les partages de Lulumineuse</span>
          </a>
        </div>
      </div>
    </aside>
  )
}
```

Notes de layout :
- La zone admin (`isAdmin`) est inchangée — pas de pied fixe pour la navigation admin (hors périmètre).
- `<aside>` garde son toggle mobile `block`/`hidden` existant, inchangé.
- La div interne passe de `p-4 lg:sticky ... lg:overflow-y-auto` à `flex flex-col lg:sticky ...` (sans overflow, sans padding) : le défilement et le padding sont maintenant portés par la sous-zone `flex-grow overflow-y-auto p-4` (le corps), tandis que le pied (`flex-shrink-0 border-t p-4`) reste hors du flux défilant. Sur desktop (`lg:`), la hauteur totale reste bornée par `max-h-[calc(100vh-4rem)]` comme avant → le pied ne peut jamais déborder de l'écran. Sur mobile, le comportement de défilement de page reste inchangé (aucune contrainte de hauteur en dessous de `lg:`, comme avant).

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run src/components/__tests__/Sidebar.test.tsx`
Expected: PASS (tous les tests, y compris les 2 existants et les 3 nouveaux).

- [ ] **Step 7: Vérifier le typecheck, le lint et le build**

Run: `pnpm tsc --noEmit && pnpm lint && pnpm build`
Expected: aucune erreur ; le build Vite réussit (l'import de `lulumineuse-logo.png` est résolu comme les wordmarks existants).

- [ ] **Step 8: Commit**

```bash
git add src/assets/lulumineuse-logo.png src/assets/README.md src/components/Sidebar.tsx src/components/__tests__/Sidebar.test.tsx
git commit -m "feat(sidebar): pied fixe avec bouton Réinitialiser permanent et crédit Lulumineuse"
```

---

### Task 3: E2E — pied de sidebar toujours visible + comportement du bouton Réinitialiser

**Files:**
- Modify: `e2e/responsive.spec.ts`

**Interfaces:**
- Consumes : rien de nouveau côté code — ce test pilote l'app réelle via Playwright (page publique `/`, pas d'authentification requise, cf. `e2e/smoke.spec.ts`).
- Produces : rien consommé par d'autres tâches (dernière tâche du plan).

- [ ] **Step 1: Ajouter les tests e2e**

Dans `e2e/responsive.spec.ts`, ajouter dans le `test.describe('Responsive', ...)` existant, après le test `'desktop: la sidebar est à côté du contenu'` :

```tsx
  test('desktop: le pied de sidebar (Réinitialiser) reste visible sans défiler la page', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 600 })
    await page.goto('/')

    await expect(page.getByRole('button', { name: /réinitialiser/i })).toBeVisible()
  })

  test('desktop: Réinitialiser est désactivé par défaut, s\'active avec un filtre, puis réinitialise', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    const resetButton = page.getByRole('button', { name: /réinitialiser/i })
    await expect(resetButton).toBeDisabled()

    await page.getByLabel('Rechercher dans le contenu').fill('test')
    await expect(resetButton).toBeEnabled()

    await resetButton.click()
    await expect(page.getByLabel('Rechercher dans le contenu')).toHaveValue('')
    await expect(resetButton).toBeDisabled()
  })
```

- [ ] **Step 2: Lancer les tests e2e en série (backend absent en local → parallèle instable, cf. note projet)**

Run: `pnpm test:e2e --workers=1 e2e/responsive.spec.ts`
Expected: PASS (5 tests : 3 existants + 2 nouveaux).

- [ ] **Step 3: Commit**

```bash
git add e2e/responsive.spec.ts
git commit -m "test(e2e): pied de sidebar visible et comportement du bouton Réinitialiser"
```

---

## Vérification finale (quality gate complet)

- [ ] **Step 1: Suite complète**

Run:
```bash
pnpm lint
pnpm tsc --noEmit
pnpm build
pnpm vitest run
pnpm test:e2e --workers=1
```
Expected: tout passe.

- [ ] **Step 2: Contrôle visuel manuel**

Ouvrir l'app en local (`pnpm dev`), réduire la hauteur de la fenêtre du navigateur, vérifier que :
- le pied de sidebar (bouton + crédit Lulumineuse) reste visible sans avoir à faire défiler la page ;
- le toggle OU/ET des mots-clés est visible même sans mot-clé coché ;
- le bouton Réinitialiser est grisé au chargement, s'active dès qu'un filtre est posé, et vide bien tous les filtres au clic.

- [ ] **Step 3: Validation du chef de projet**

Ne cocher aucune case du devbook tant que le chef de projet n'a pas explicitement validé le rendu (règle du projet, cf. `CLAUDE.md`).
