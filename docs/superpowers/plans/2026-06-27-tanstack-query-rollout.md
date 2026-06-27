# TanStack Query Rollout (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduire TanStack Query (React Query) comme couche d'« état serveur » par-dessus la couche de services existante (`apiClient`), pour tous les écrans de données de la Tranche 3, sans modifier les services ni l'API PHP.

**Architecture:** Query se pose **entre** les composants et `apiClient`. Les `queryFn`/`mutationFn` appellent `apiClient.*` (jamais `fetch` directement). Lecture = `useQuery`/`useInfiniteQuery` ; écriture = `useMutation` qui **invalide** les clés impactées (le rechargement est automatique). On supprime la tuyauterie manuelle (`useState`+`useEffect`+`setLoading`+mutations locales de liste).

**Tech Stack:** React 19, TypeScript, `@tanstack/react-query` (à installer), Vitest + Testing Library, Vite. Existant : `@tanstack/react-table`, `@tanstack/react-virtual`.

## Global Constraints

- **Abstraction impérative** : `queryFn`/`mutationFn` appellent `EpurielServices`/`apiClient`, **jamais `fetch` directement** (rule `.claude/rules/frontend.md`, doc `_contexte-ia/01_architecture.md`).
- **Clés de cache centralisées** dans un module unique `queryKeys` ; invalidation des clés impactées après chaque mutation.
- **Pas de cache hors-ligne** (online-only v1). `QueryClientProvider` monté à la racine.
- Identifiants techniques en **anglais** ; libellés UI en **français accentué**.
- Format de réponse API inchangé : `{ status: 'ok'|'error', data, errors }`. Une `queryFn` **lève** une `Error(errors[0])` si `status !== 'ok'`.
- Quality gate avant tout commit : `pnpm lint` + `pnpm tsc --noEmit` + `pnpm build` + `pnpm test` verts ; `php -l` non concerné (aucun PHP modifié) ; `gitleaks detect -v` propre.
- Commits fréquents, un par tâche. **Ne pas pousser** sans demande explicite du chef de projet.
- Branche de travail : `Tranche-3---integration-cloud` (déjà en place).

---

### Task 1: Socle Query (client, provider, clés, helper de test)

**Files:**
- Modify: `package.json` (ajout dépendance)
- Create: `src/services/queryClient.ts`
- Create: `src/services/queryKeys.ts`
- Modify: `src/main.tsx` (monter `QueryClientProvider`)
- Create: `src/test/renderWithClient.tsx`
- Test: `src/services/__tests__/queryClient.test.tsx`

**Interfaces:**
- Produces: `queryClient` (instance partagée prod) ; `createQueryClient()` (fabrique, utilisée par les tests) ; `queryKeys` (objet de clés) ; `renderWithClient(ui)` (helper de rendu test enveloppant dans un `QueryClientProvider` neuf).

- [ ] **Step 1: Installer la dépendance**

Run: `pnpm add @tanstack/react-query`
Expected: `package.json` gagne `"@tanstack/react-query"` ; `pnpm-lock.yaml` mis à jour.

- [ ] **Step 2: Créer la fabrique de client + l'instance prod**

Create `src/services/queryClient.ts` :

```ts
import { QueryClient, QueryCache } from '@tanstack/react-query'
import { toast } from 'sonner'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    // Les erreurs de CHARGEMENT (queries) remontent ici une seule fois → toast centralisé.
    queryCache: new QueryCache({
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'Erreur de chargement.')
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

// Instance unique pour l'application (les tests utilisent createQueryClient()).
export const queryClient = createQueryClient()
```

- [ ] **Step 3: Créer le registre de clés de cache**

Create `src/services/queryKeys.ts` :

```ts
export const queryKeys = {
  oeuvres: ['oeuvres'] as const,
  auteurs: ['auteurs'] as const,
  themes: ['themes'] as const,
  keywords: ['keywords'] as const,
  etats: ['etats'] as const,
  emojis: ['emojis'] as const,
  favorites: ['favorites'] as const,
  // Recherche corpus paginée (clé = empreinte des filtres débouncés).
  citationsSearch: (filtersKey: string) => ['citations', 'search', filtersKey] as const,
  // Liste admin des citations.
  citationsAdmin: (filtersKey: string) => ['citations', 'admin', filtersKey] as const,
}
```

- [ ] **Step 4: Monter le provider à la racine**

Modify `src/main.tsx` — envelopper `<App/>` dans `QueryClientProvider` (au-dessus de `AuthProvider`) :

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import { AuthProvider } from '@/components/AuthProvider'
import { queryClient } from '@/services/queryClient'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
```

- [ ] **Step 5: Créer le helper de rendu pour les tests**

Create `src/test/renderWithClient.tsx` :

```tsx
import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/services/queryClient'

// Un client neuf par rendu : pas de cache partagé entre tests ; pas de retry (échecs immédiats).
export function renderWithClient(ui: ReactElement) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, staleTime: 0 } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  return { client, ...render(ui, { wrapper: Wrapper }) }
}
```

- [ ] **Step 6: Écrire le test de fumée du socle**

Create `src/services/__tests__/queryClient.test.tsx` :

```tsx
import { useQuery } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'

function Probe() {
  const { data } = useQuery({ queryKey: ['probe'], queryFn: async () => 'pong' })
  return <div>{data ?? '…'}</div>
}

describe('socle Query', () => {
  it('useQuery fonctionne dans renderWithClient', async () => {
    renderWithClient(<Probe />)
    await waitFor(() => expect(screen.getByText('pong')).toBeInTheDocument())
  })
})
```

- [ ] **Step 7: Lancer le test**

Run: `pnpm test -- src/services/__tests__/queryClient.test.tsx`
Expected: PASS.

- [ ] **Step 8: Vérifier build + types**

Run: `pnpm tsc --noEmit && pnpm build`
Expected: 0 erreur.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml src/services/queryClient.ts src/services/queryKeys.ts src/main.tsx src/test/renderWithClient.tsx src/services/__tests__/queryClient.test.tsx
git commit -m "feat(query): socle TanStack Query — client, clés, provider, helper de test"
```

---

### Task 2: Hooks de référentiels partagés (lecture)

But : centraliser les listes de référence (œuvres, auteurs, thèmes, mots-clés, états, emojis) utilisées par plusieurs écrans (pages admin **et** `CorpusSearchProvider`). DRY.

**Files:**
- Create: `src/services/referenceQueries.ts`
- Test: `src/services/__tests__/referenceQueries.test.tsx`

**Interfaces:**
- Produces: `useOeuvres()`, `useAuteurs()`, `useThemes()`, `useKeywords()`, `useEtats()`, `useEmojis()` — chacune renvoie un `UseQueryResult<T[]>`. `T` = `unknown` pour œuvres/auteurs/thèmes/états (l'appelant caste vers son type local, comme aujourd'hui) ; mots-clés = `{ id: number; mot: string }` ; emojis = `{ id: number; code: string }`.

- [ ] **Step 1: Écrire les tests**

Create `src/services/__tests__/referenceQueries.test.tsx` :

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { createQueryClient } from '@/services/queryClient'
import { useOeuvres } from '@/services/referenceQueries'

vi.mock('@/services/api', () => ({
  apiClient: {
    findOeuvres: vi.fn().mockResolvedValue({
      status: 'ok',
      data: [{ id: 1, nom: 'ebook' }],
      errors: [],
    }),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useOeuvres', () => {
  it('charge les œuvres via apiClient', async () => {
    const { result } = renderHook(() => useOeuvres(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 1, nom: 'ebook' }])
  })
})
```

- [ ] **Step 2: Lancer le test (échoue : module absent)**

Run: `pnpm test -- src/services/__tests__/referenceQueries.test.tsx`
Expected: FAIL (`Cannot find module '@/services/referenceQueries'`).

- [ ] **Step 3: Implémenter les hooks**

Create `src/services/referenceQueries.ts` :

```ts
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'

// Lève si status !== 'ok' → l'erreur remonte au QueryCache.onError (toast centralisé).
async function unwrap<T>(p: Promise<{ status: string; data: T | null; errors: string[] }>): Promise<T> {
  const r = await p
  if (r.status !== 'ok') throw new Error(r.errors?.[0] ?? 'Erreur de chargement.')
  return (r.data ?? ([] as unknown as T)) as T
}

export function useOeuvres() {
  return useQuery({ queryKey: queryKeys.oeuvres, queryFn: () => unwrap(apiClient.findOeuvres()) })
}
export function useAuteurs() {
  return useQuery({ queryKey: queryKeys.auteurs, queryFn: () => unwrap(apiClient.findAuteurs()) })
}
export function useThemes() {
  return useQuery({ queryKey: queryKeys.themes, queryFn: () => unwrap(apiClient.findThemes()) })
}
export function useKeywords() {
  return useQuery({ queryKey: queryKeys.keywords, queryFn: () => unwrap(apiClient.findKeywords()) })
}
export function useEtats() {
  return useQuery({ queryKey: queryKeys.etats, queryFn: () => unwrap(apiClient.findEtats()) })
}
export function useEmojis() {
  return useQuery({ queryKey: queryKeys.emojis, queryFn: () => unwrap(apiClient.findEmojis()) })
}
```

- [ ] **Step 4: Lancer le test (passe)**

Run: `pnpm test -- src/services/__tests__/referenceQueries.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/referenceQueries.ts src/services/__tests__/referenceQueries.test.tsx
git commit -m "feat(query): hooks de référentiels partagés (useOeuvres, useAuteurs, …)"
```

---

### Task 3: Migrer OeuvresPage (motif CRUD de référence)

But : établir le motif `useQuery` (liste) + `useMutation` (create/update/delete + invalidation). **Toute la partie JSX du formulaire reste inchangée** ; on ne touche qu'à la couche données (haut du composant + handlers).

**Files:**
- Modify: `src/features/admin/OeuvresPage.tsx`
- Test: `src/features/admin/__tests__/OeuvresPage.test.tsx` (créer si absent ; sinon adapter)

**Interfaces:**
- Consumes: `useOeuvres`, `useAuteurs` (Task 2) ; `queryKeys` (Task 1).

- [ ] **Step 1: Écrire/adapter le test avec `renderWithClient`**

Create `src/features/admin/__tests__/OeuvresPage.test.tsx` :

```tsx
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'
import { OeuvresPage } from '../OeuvresPage'

const OEUVRES = vi.hoisted(() => [
  { id: 1, nom: 'ebook', auteur_id: 5, auteur_nom: 'Lulumineuse', abreviation: null, url: null, ref_libraire: null, description: null },
])
const AUTEURS = vi.hoisted(() => [{ id: 5, nom: 'Lulumineuse' }])

vi.mock('@/services/api', () => ({
  apiClient: {
    findOeuvres: vi.fn().mockResolvedValue({ status: 'ok', data: OEUVRES, errors: [] }),
    findAuteurs: vi.fn().mockResolvedValue({ status: 'ok', data: AUTEURS, errors: [] }),
    createOeuvre: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 2 }, errors: [] }),
    updateOeuvre: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 1 }, errors: [] }),
    deleteOeuvre: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { apiClient } from '@/services/api'
beforeEach(() => vi.clearAllMocks())

describe('OeuvresPage', () => {
  it('affiche les œuvres au chargement', async () => {
    renderWithClient(<OeuvresPage />)
    await waitFor(() => expect(screen.getByText('ebook')).toBeInTheDocument())
  })

  it('appelle createOeuvre avec les bonnes données', async () => {
    renderWithClient(<OeuvresPage />)
    await waitFor(() => screen.getByLabelText('Créer une nouvelle œuvre'))
    await userEvent.click(screen.getByLabelText('Créer une nouvelle œuvre'))
    await userEvent.type(screen.getByLabelText("Titre de l'œuvre"), 'Articles')
    await userEvent.selectOptions(screen.getByLabelText("Auteur de l'œuvre"), '5')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() =>
      expect(apiClient.createOeuvre).toHaveBeenCalledWith(expect.objectContaining({ nom: 'Articles', auteur_id: 5 })),
    )
  })

  it('appelle deleteOeuvre après confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    renderWithClient(<OeuvresPage />)
    await waitFor(() => screen.getByTestId('oeuvre-item-1'))
    await userEvent.click(screen.getByTestId('oeuvre-item-1'))
    await userEvent.click(screen.getByRole('button', { name: /supprimer/i }))
    await waitFor(() => expect(apiClient.deleteOeuvre).toHaveBeenCalledWith(1))
  })
})
```

- [ ] **Step 2: Lancer le test (échoue : ancien composant sans provider / nouveaux libellés)**

Run: `pnpm test -- src/features/admin/__tests__/OeuvresPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Remplacer la couche données dans `OeuvresPage.tsx`**

Remplacer les imports + le bloc d'état/chargement (lignes ~1-62) par ceci. **Le reste du composant (handlers de formulaire à partir de `function selectOeuvre` et tout le JSX) est conservé**, à l'exception des handlers `handleSave`/`handleDelete` réécrits au Step 4 :

```tsx
import { useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'
import { useOeuvres, useAuteurs } from '@/services/referenceQueries'

// (types Oeuvre, Auteur, schema, FormState, emptyForm : INCHANGÉS)

export function OeuvresPage() {
  const qc = useQueryClient()
  const { data: oeuvres = [] } = useOeuvres() as { data?: Oeuvre[] }
  const { data: auteurs = [] } = useAuteurs() as { data?: Auteur[] }

  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.createOeuvre(payload),
    onSuccess: (r) => {
      if (r.status !== 'ok') { toast.error((r.errors)?.[0] ?? 'Création impossible.'); return }
      qc.invalidateQueries({ queryKey: queryKeys.oeuvres })
      setSelectedId((r.data as { id: number }).id)
      toast.success('Œuvre créée.')
    },
  })
  const updateMut = useMutation({
    mutationFn: (vars: { id: number; payload: Record<string, unknown> }) =>
      apiClient.updateOeuvre(vars.id, vars.payload),
    onSuccess: (r) => {
      if (r.status !== 'ok') { toast.error((r.errors)?.[0] ?? 'Modification impossible.'); return }
      qc.invalidateQueries({ queryKey: queryKeys.oeuvres })
      toast.success('Modifications enregistrées.')
    },
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient.deleteOeuvre(id),
    onSuccess: (r) => {
      if (r.status !== 'ok') { toast.error((r.errors)?.[0] ?? 'Suppression impossible.'); return }
      qc.invalidateQueries({ queryKey: queryKeys.oeuvres })
      setSelectedId(null); setForm(emptyForm)
      toast.success('Œuvre supprimée.')
    },
  })
  const saving = createMut.isPending || updateMut.isPending
```

- [ ] **Step 4: Réécrire `handleSave`/`handleDelete` pour appeler les mutations**

Remplacer les corps de `handleSave` et `handleDelete` (la validation Zod reste identique) :

```tsx
  async function handleSave() {
    const parsed = schema.safeParse({
      ...form,
      auteur_id: form.auteur_id ? parseInt(form.auteur_id, 10) : undefined,
    })
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {}
      for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as keyof FormState] = issue.message
      setErrors(fieldErrors)
      return
    }
    const payload = {
      nom: form.nom.trim(),
      auteur_id: parseInt(form.auteur_id, 10),
      abreviation: form.abreviation.trim() || null,
      url: form.url.trim() || null,
      ref_libraire: form.ref_libraire.trim() || null,
      description: form.description.trim() || null,
    }
    if (selectedId === 'new') createMut.mutate(payload)
    else if (typeof selectedId === 'number') updateMut.mutate({ id: selectedId, payload })
  }

  function handleDelete() {
    if (typeof selectedId !== 'number') return
    if (!window.confirm('Supprimer cette œuvre ? Cette action est irréversible.')) return
    deleteMut.mutate(selectedId)
  }
```

Note : `selectOeuvre`/`startNew` et tout le JSX restent **inchangés** (ils lisent `oeuvres`/`auteurs`/`form`/`errors`/`saving`, toujours disponibles).

- [ ] **Step 5: Lancer le test + le typecheck**

Run: `pnpm test -- src/features/admin/__tests__/OeuvresPage.test.tsx && pnpm tsc --noEmit`
Expected: PASS, 0 erreur de type.

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/OeuvresPage.tsx src/features/admin/__tests__/OeuvresPage.test.tsx
git commit -m "refactor(query): OeuvresPage via useQuery/useMutation (motif CRUD de référence)"
```

---

### Tasks 4-8 : Migrer les autres référentiels (même motif que Task 3)

Pour **chaque** page ci-dessous, appliquer le motif de la Task 3 : remplacer `useState`+`useEffect` de la liste par le hook de référentiel ; remplacer les handlers create/update/delete par des `useMutation` qui **invalident la clé correspondante** ; adapter le test pour utiliser `renderWithClient` et mocker les méthodes `apiClient` listées. **Le JSX de chaque page reste inchangé.** Un commit par page : `refactor(query): <Page> via useQuery/useMutation`.

### Task 4: AuteursPage
- **File:** `src/features/admin/AuteursPage.tsx` · **Test:** `src/features/admin/__tests__/AuteursPage.test.tsx` (existe déjà — remplacer `render(` par `renderWithClient(` et garder les mocks).
- Hook liste : `useAuteurs()`. Clé invalidée : `queryKeys.auteurs`.
- Mutations : `apiClient.createAuteur(payload)`, `apiClient.updateAuteur(id, payload)`, `apiClient.deleteAuteur(id)`.
- [ ] Adapter le test (`renderWithClient`) → lancer → FAIL.
- [ ] Migrer la page (motif Task 3) → lancer → PASS.
- [ ] `pnpm tsc --noEmit` → commit.

### Task 5: ThemesPage
- **File:** `src/features/admin/ThemesPage.tsx` · **Test:** `src/features/admin/__tests__/ThemesPage.test.tsx` (adapter à `renderWithClient`).
- Hook liste : `useThemes()`. Clé invalidée : `queryKeys.themes`.
- Mutations : `apiClient.createTheme(payload)`, `apiClient.updateTheme(id, payload)`, `apiClient.deleteTheme(id)`.
- Particularité : arbre ≤ 2 niveaux calculé côté client à partir de la liste plate — la logique d'arbre reste inchangée, elle consomme `data` du hook.
- [ ] Adapter test → FAIL → migrer → PASS → `tsc` → commit.

### Task 6: KeywordsPage
- **File:** `src/features/admin/KeywordsPage.tsx` · **Test:** `src/features/admin/__tests__/KeywordsPage.test.tsx` (créer si absent).
- Hook liste : `useKeywords()` (type `{ id: number; mot: string }[]`). Clé invalidée : `queryKeys.keywords`.
- Mutations : `apiClient.createKeyword(payload)` (ou `findOrCreateKeyword(mot)` selon l'UI existante), `apiClient.deleteKeyword(id)`.
- [ ] Adapter test → FAIL → migrer → PASS → `tsc` → commit.

### Task 7: EtatsPage
- **File:** `src/features/admin/EtatsPage.tsx` · **Test:** `src/features/admin/__tests__/EtatsPage.test.tsx` (créer si absent).
- Hook liste : `useEtats()`. Clé invalidée : `queryKeys.etats`.
- Mutations : `apiClient.updateEtat(id, payload)`, `apiClient.deleteEtat(id)` (états système non supprimables — garde existante conservée). **Pas** de create (états figés C/R/P).
- [ ] Adapter test → FAIL → migrer → PASS → `tsc` → commit.

### Task 8: EmojisPage
- **File:** `src/features/admin/EmojisPage.tsx` · **Test:** `src/features/admin/__tests__/EmojisPage.test.tsx` (créer si absent).
- Hook liste : `useEmojis()` (type `{ id: number; code: string }[]`). Clé invalidée : `queryKeys.emojis`.
- Mutations : `apiClient.createEmoji({ code })`, `apiClient.deleteEmoji(id)`.
- [ ] Adapter test → FAIL → migrer → PASS → `tsc` → commit.

---

### Task 9: Migrer CitationsAdminPage (liste + actions groupées)

But : migrer la gestion des entrées (table, sélection multiple, actions groupées, suppression douce, édition rapide).

**Files:**
- Modify: `src/features/admin/CitationsAdminPage.tsx`
- Test: `src/features/admin/__tests__/CitationsAdminPage.test.tsx` (adapter à `renderWithClient`)

**Interfaces:**
- Consumes: `queryKeys.citationsAdmin`, `useOeuvres`, `useThemes`, `useEtats`, `useKeywords` (pour les filtres/actions groupées).

- [ ] **Step 1:** Lire intégralement `src/features/admin/CitationsAdminPage.tsx` (539 lignes) pour repérer : chargement de la liste, état de sélection, handlers d'actions groupées et de suppression.
- [ ] **Step 2:** Adapter le test existant : `render(` → `renderWithClient(`. Lancer → FAIL.
- [ ] **Step 3:** Liste via `useQuery({ queryKey: queryKeys.citationsAdmin(filtersKey), queryFn: () => unwrap(apiClient.findCitations(params)) })` (réutiliser le helper `unwrap` — l'extraire dans `src/services/referenceQueries.ts` et l'exporter, ou le dupliquer localement). `filtersKey` = empreinte sérialisée des filtres admin.
- [ ] **Step 4:** Remplacer les handlers par des `useMutation` invalidant `['citations']` (préfixe) après succès :
  - `apiClient.bulkUpdateCitations(ids, fields)` (changement groupé œuvre/état/thème/mots-clés)
  - `apiClient.bulkDeleteCitations(ids)` (suppression douce groupée)
  - `apiClient.updateCitation(id, data)` (édition rapide)
  - `apiClient.deleteCitation(id)` (suppression unitaire)
  - Invalidation : `qc.invalidateQueries({ queryKey: ['citations'] })` (couvre search **et** admin).
- [ ] **Step 5:** Lancer le test → PASS ; `pnpm tsc --noEmit` → 0 erreur.
- [ ] **Step 6:** Commit `refactor(query): CitationsAdminPage via useQuery/useMutation + actions groupées`.

---

### Task 10: Migrer CorpusSearchProvider (recherche keyset → useInfiniteQuery)

But : remplacer la mécanique manuelle (effet débouncé + `loadMore` + refs de génération/cancellation) par `useInfiniteQuery`. C'est la tâche la plus délicate — la traiter isolément.

**Files:**
- Modify: `src/features/corpus/CorpusSearchProvider.tsx`
- Test: `src/features/corpus/__tests__/CorpusSearchProvider.test.tsx` (adapter à `renderWithClient`)

**Interfaces:**
- Consumes: `useOeuvres`, `useThemes`, `useKeywords` (Task 2) ; `queryKeys.citationsSearch` ; `buildCitationParams`, `useDebouncedValue`, `buildThemeTree`, `toggleThemeNode` (existants, inchangés).
- Produces: `CorpusSearchContextValue` **inchangé** (mêmes champs : `items`, `loading`, `error`, `hasMore`, `loadingMore`, `loadMore`, `refresh`, …) — les consommateurs (`CorpusFilters`, `ResultsInfoBar`, `AccueilPage`) ne changent pas.

- [ ] **Step 1:** Adapter le test : `render(` → `renderWithClient(`. Lancer → FAIL.
- [ ] **Step 2:** Remplacer les 3 référentiels (œuvres/thèmes/mots-clés) par `useOeuvres()`/`useThemes()`/`useKeywords()` ; supprimer leurs `useState`+`useEffect`.
- [ ] **Step 3:** Conserver l'état des **filtres** (`query`, `selectedOeuvreIds`, …) en `useState`, et l'empreinte débouncée `debouncedKey` via `useDebouncedValue` (inchangé).
- [ ] **Step 4:** Remplacer le gros `useEffect` de recherche + `loadMore` par :

```tsx
const search = useInfiniteQuery({
  queryKey: queryKeys.citationsSearch(debouncedKey),
  queryFn: ({ pageParam }) =>
    unwrap(
      apiClient.findCitations(
        buildCitationParams(
          { query, oeuvreIds: selectedOeuvreIds, themeIds: selectedThemeIds, keywordIds, keywordMode, dateFrom, dateTo, sort },
          pageParam ?? undefined,
        ),
      ),
    ) as Promise<{ items: Citation[]; next_cursor: string | null }>,
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage) => lastPage.next_cursor,
})
```

- [ ] **Step 5:** Recomposer la valeur de contexte à partir de `search` :
  - `items` = `search.data?.pages.flatMap((p) => p.items) ?? []`
  - `loading` = `search.isLoading`
  - `error` = `search.isError ? (search.error as Error).message : null`
  - `hasMore` = `search.hasNextPage`
  - `loadingMore` = `search.isFetchingNextPage`
  - `loadMore` = `() => search.fetchNextPage()`
  - `refresh` = `() => search.refetch()`
  - (les `set*`/`toggle*`/`reset`/`hasActiveFilters`/`filtersOpen` restent inchangés)
- [ ] **Step 6:** Supprimer les refs devenues inutiles (`filtersRef`, `nextCursorRef`, `loadingMoreRef`, `searchGenRef`, `refreshTick`) et les `eslint-disable` associés.
- [ ] **Step 7:** Lancer le test → PASS ; `pnpm tsc --noEmit` ; `pnpm lint` (vérifier qu'il ne reste plus de warning `set-state-in-effect`/`refs`).
- [ ] **Step 8:** Commit `refactor(query): CorpusSearchProvider via useInfiniteQuery (keyset)`.

---

### Task 11: Migrer useFavorites

But : remplacer le hook favoris (effet + état manuel) par `useQuery` + `useMutation` optimiste.

**Files:**
- Modify: `src/hooks/useFavorites.ts`
- Test: `src/hooks/__tests__/useFavorites.test.ts` (adapter à un wrapper `QueryClientProvider`)

**Interfaces:**
- Produces: `useFavorites()` renvoyant `{ favoriteIds: Set<number>; toggle: (id: number) => void; loading: boolean }` — **signature inchangée** (les consommateurs ne changent pas).

- [ ] **Step 1:** Adapter le test pour envelopper le `renderHook` dans un `QueryClientProvider` (client neuf, `retry: false`). Lancer → FAIL.
- [ ] **Step 2:** Cas **utilisateur serveur** (`isServerUser`) : `useQuery({ queryKey: queryKeys.favorites, queryFn: () => unwrap(apiClient.findFavorites()), enabled: isServerUser })`, puis dériver `favoriteIds: Set<number>` depuis `data.items`. `loading = query.isLoading`.
- [ ] **Step 3:** `toggle` serveur via `useMutation` (`apiClient.addFavorite`/`removeFavorite`) avec **mise à jour optimiste** du cache `queryKeys.favorites` (`onMutate` → `setQueryData` ; `onError` → rollback + `toast.error`).
- [ ] **Step 4:** Cas **invité** (non serveur) : conserver la logique `localStorage` existante (`loadLocalFavorites`/`saveLocalFavorites`), gérée hors Query (état local), `loading = false`.
- [ ] **Step 5:** Lancer le test → PASS ; `pnpm tsc --noEmit`.
- [ ] **Step 6:** Commit `refactor(query): useFavorites via useQuery/useMutation (optimiste)`.

---

### Task 12: Vérification finale + nettoyage

**Files:** aucun nouveau ; vérification transverse.

- [ ] **Step 1:** Rechercher d'éventuels `useEffect`+`apiClient` résiduels dans les écrans migrés :

Run: `grep -rnE "apiClient\.(find|get)" src/features src/hooks | grep -v "services/"`
Expected: plus aucun chargement manuel dans les écrans Tranche 3 (les appels restants doivent être dans les `queryFn`/`mutationFn` ou hors périmètre, ex. Users/Roles non migrés — voir « Hors périmètre »).

- [ ] **Step 2:** Quality gate complet :

Run: `pnpm lint && pnpm tsc --noEmit && pnpm build && pnpm test`
Expected: tout vert (warnings `set-state-in-effect`/`refs` disparus des écrans migrés).

- [ ] **Step 3:** Contrôle visuel après déploiement (le login local est impossible — déployer pour tester) : sur `https://lumosphere.org/?dev=ouilulu`, vérifier : liste admin se charge, création/édition/suppression se reflètent **sans rechargement manuel**, recherche réactive + « charger plus », favoris persistants.

- [ ] **Step 4:** Commit éventuel de nettoyage `chore(query): retrait des refs/effets manuels résiduels`.

---

## Hors périmètre (de ce plan)

- `UsersPage` et `RolesAccessPage` (Tranche 1/2, déjà fonctionnels) : même motif applicable, mais migration **optionnelle** — à planifier séparément si souhaité, pour cohérence.
- `LiteLLMConfigPage` (config + test de connexion) : peu de données distantes ; migration facultative (`getConfig`/`setConfig` via `useQuery`/`useMutation`, `aiTestConnection` reste une action ponctuelle). À traiter en appoint si le temps le permet.
- Retouches de **mise en page** : explicitement reportées **après** ce branchement Query (décision chef de projet).
- Aucune modification de l'API PHP ni de la couche `apiClient`.

## Self-Review (effectué)

- **Couverture spec (§III.0 doc)** : socle (T1), abstraction respectée (queryFn→apiClient partout), invalidation après mutation (T3-T11), pas de cache hors-ligne (T1) → couvert.
- **Placeholders** : aucun « TBD » ; chaque tâche nomme les méthodes `apiClient` réelles et les clés `queryKeys` réelles. Tasks 4-8 réutilisent le motif complet de la Task 3 (code de référence présent) en ne variant que les noms exacts fournis.
- **Cohérence des types/noms** : `queryKeys.*` définis en T1 et consommés tels quels ; `unwrap` défini en T2, réutilisé en T9/T10 (à exporter depuis `referenceQueries.ts`) ; `renderWithClient` défini en T1, utilisé partout.
