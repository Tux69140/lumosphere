# Mots-clés améliorés — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Améliorer la vue admin Mots-clés avec surbrillance au survol, édition inline du libellé, et suppression bloquée si utilisé (avec liste des entrées concernées).

**Architecture:** Le DAL keywords est enrichi (LEFT JOIN COUNT, UPDATE, usages). L'endpoint PHP reçoit deux nouvelles routes. La couche services TypeScript ajoute `updateKeyword`, `getKeywordUsages` et `useKeywordUsages`. `KeywordsPage` gère l'état local d'édition et l'ouverture du panneau d'usages.

**Tech Stack:** PHP 8.1 / PDO / MariaDB, React 19 / TypeScript / TanStack Query, Vitest / Testing Library, Tailwind CSS, Phosphor Icons

## Global Constraints

- Couche d'abstraction obligatoire : `KeywordsPage` appelle `useKeywords`, `useKeywordUsages`, `useMutation(apiClient.*)` — jamais `fetch` directement.
- PDO bound parameters uniquement — jamais de concaténation SQL.
- Permission `keywords.manage` pour toute écriture, `corpus.read` pour lecture.
- CSRF géré automatiquement par `apiClient.put()`.
- Nommage : fonctions PHP `dal_*` (DAL) / `endpoint_*` (endpoint) ; hooks TS `use*` ; composants `PascalCase`.
- Mots-clés normalisés : `mb_strtolower(trim($mot), 'UTF-8')` — règle partagée `_dal_normalize_keyword()`.
- Icônes : Phosphor Icons uniquement.

---

## Fichiers touchés

| Fichier | Statut |
|---------|--------|
| `api/dal/keywords.php` | Modifié — COUNT dans find, + update, + usages, + protection delete |
| `api/endpoints/keywords.php` | Modifié — 2 nouvelles routes PUT/{id} et GET/{id}/usages |
| `src/services/queryKeys.ts` | Modifié — clé `keywordUsages` |
| `src/services/api.ts` | Modifié — `updateKeyword` + `getKeywordUsages` |
| `src/services/referenceQueries.ts` | Modifié — `useKeywordUsages` |
| `src/features/admin/KeywordsPage.tsx` | Modifié — surbrillance, édition inline, panneau usages |
| `src/features/admin/__tests__/KeywordsPage.test.tsx` | Modifié — mocks étendus + nouveaux tests |

---

## Tâche 1 : Backend PHP

**Fichiers :**
- Modifier : `api/dal/keywords.php`
- Modifier : `api/endpoints/keywords.php`

**Interfaces produites :**
- `GET /api/keywords` → `[{ id, mot, citation_count }]`
- `PUT /api/keywords/{id}` body `{ mot }` → `{ status: 'ok', data: { id } }`
- `GET /api/keywords/{id}/usages` → `[{ citation_id, titre }]`
- `DELETE /api/keywords/{id}` bloqué si `citation_count > 0`

- [ ] **Étape 1 : Réécrire `dal_find_keywords` avec COUNT**

Remplacer le corps de `dal_find_keywords` dans `api/dal/keywords.php` :

```php
function dal_find_keywords(PDO $pdo, array $ctx, ?string $search = null): array
{
    dal_require_permission($ctx, 'corpus.read');
    if ($search !== null && $search !== '') {
        $stmt = $pdo->prepare(
            'SELECT k.id, k.mot, COUNT(ck.citation_id) AS citation_count
             FROM keywords k
             LEFT JOIN citation_keywords ck ON ck.keyword_id = k.id
             WHERE k.mot LIKE :search
             GROUP BY k.id, k.mot
             ORDER BY k.mot
             LIMIT 100'
        );
        $stmt->execute(['search' => _dal_normalize_keyword($search) . '%']);
    } else {
        $stmt = $pdo->prepare(
            'SELECT k.id, k.mot, COUNT(ck.citation_id) AS citation_count
             FROM keywords k
             LEFT JOIN citation_keywords ck ON ck.keyword_id = k.id
             GROUP BY k.id, k.mot
             ORDER BY k.mot'
        );
        $stmt->execute();
    }
    return dal_ok($stmt->fetchAll());
}
```

- [ ] **Étape 2 : Ajouter `dal_update_keyword` dans `api/dal/keywords.php`**

Ajouter après `dal_find_or_create_keyword` :

```php
function dal_update_keyword(PDO $pdo, array $ctx, int $id, string $mot): array
{
    dal_require_permission($ctx, 'keywords.manage');
    $normalized = _dal_normalize_keyword($mot);
    if ($normalized === '') {
        return dal_error('Le mot-clé ne peut pas être vide.');
    }
    $stmt = $pdo->prepare('SELECT id FROM keywords WHERE id = :id');
    $stmt->execute(['id' => $id]);
    if (!$stmt->fetch()) {
        return dal_error('Mot-clé introuvable.');
    }
    try {
        $pdo->prepare('UPDATE keywords SET mot = :mot WHERE id = :id')
            ->execute(['mot' => $normalized, 'id' => $id]);
        return dal_ok(['id' => $id]);
    } catch (\PDOException $e) {
        if ($e->getCode() === '23000') {
            return dal_error('Ce mot-clé existe déjà.');
        }
        throw $e;
    }
}
```

- [ ] **Étape 3 : Ajouter `dal_get_keyword_usages` dans `api/dal/keywords.php`**

Ajouter après `dal_update_keyword` :

```php
function dal_get_keyword_usages(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'keywords.manage');
    $stmt = $pdo->prepare(
        "SELECT c.id AS citation_id, LEFT(c.contenu, 80) AS titre
         FROM citations c
         JOIN citation_keywords ck ON ck.citation_id = c.id
         WHERE ck.keyword_id = :id AND c.deleted_at IS NULL
         ORDER BY c.id
         LIMIT 50"
    );
    $stmt->execute(['id' => $id]);
    return dal_ok($stmt->fetchAll());
}
```

- [ ] **Étape 4 : Protéger `dal_delete_keyword` dans `api/dal/keywords.php`**

Remplacer le corps de `dal_delete_keyword` :

```php
function dal_delete_keyword(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'keywords.manage');
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM citation_keywords WHERE keyword_id = :id');
    $stmt->execute(['id' => $id]);
    if ((int) $stmt->fetchColumn() > 0) {
        return dal_error('Ce mot-clé est utilisé dans des entrées. Retirez-le d\'abord.');
    }
    $stmt = $pdo->prepare('DELETE FROM keywords WHERE id = :id');
    $stmt->execute(['id' => $id]);
    return $stmt->rowCount() > 0 ? dal_ok() : dal_error('Mot-clé introuvable.');
}
```

- [ ] **Étape 5 : Mettre à jour `api/endpoints/keywords.php`**

Remplacer le fichier entier :

```php
<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/keywords.php';

function endpoint_keywords(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET'  && $id === null                          => dal_find_keywords($pdo, $ctx, $_GET['search'] ?? null),
        $method === 'GET'  && $id !== null && $action === 'usages'  => dal_get_keyword_usages($pdo, $ctx, $id),
        $method === 'POST' && $id === null && $action === 'find-or-create' => dal_find_or_create_keyword($pdo, $ctx, $body['mot'] ?? ''),
        $method === 'POST' && $id === null                          => dal_create_keyword($pdo, $ctx, $body['mot'] ?? ''),
        $method === 'PUT'  && $id !== null                          => dal_update_keyword($pdo, $ctx, $id, $body['mot'] ?? ''),
        $method === 'DELETE' && $id !== null                        => dal_delete_keyword($pdo, $ctx, $id),
        default                                                     => dal_error('Méthode non supportée.'),
    };
}
```

- [ ] **Étape 6 : Vérifier la syntaxe PHP**

```bash
php -l api/dal/keywords.php && php -l api/endpoints/keywords.php
```

Résultat attendu : `No syntax errors detected` sur les deux fichiers.

- [ ] **Étape 7 : Commit**

```bash
git add api/dal/keywords.php api/endpoints/keywords.php
git commit -m "feat(api): keywords — COUNT usages, update, get_usages, protection delete"
```

---

## Tâche 2 : Couche services frontend

**Fichiers :**
- Modifier : `src/services/queryKeys.ts`
- Modifier : `src/services/api.ts`
- Modifier : `src/services/referenceQueries.ts`

**Interfaces produites :**
- `queryKeys.keywordUsages(id: number)` = `['keywords', 'usages', id] as const`
- `apiClient.updateKeyword(id, mot)` → `PUT /api/keywords/{id}`
- `apiClient.getKeywordUsages(id)` → `GET /api/keywords/{id}/usages`
- `useKeywordUsages(id: number | null)` → `UseQueryResult<{ citation_id: number; titre: string }[]>`

- [ ] **Étape 1 : Ajouter la clé dans `queryKeys.ts`**

Après `collectSources: ['collectSources'] as const,` ajouter :

```ts
  keywordUsages: (id: number) => ['keywords', 'usages', id] as const,
```

- [ ] **Étape 2 : Ajouter les méthodes dans `api.ts`**

Après la ligne `deleteKeyword: (id: number) => del<void>(\`keywords/${id}\`),` ajouter :

```ts
  updateKeyword: (id: number, mot: string) => put<{ id: number }>(`keywords/${id}`, { mot }),
  getKeywordUsages: (id: number) =>
    get<{ citation_id: number; titre: string }[]>(`keywords/${id}/usages`),
```

- [ ] **Étape 3 : Ajouter `useKeywordUsages` dans `referenceQueries.ts`**

Après `useKeywords()`, ajouter :

```ts
export function useKeywordUsages(id: number | null) {
  return useQuery({
    queryKey: queryKeys.keywordUsages(id ?? 0),
    queryFn: () =>
      unwrap<{ citation_id: number; titre: string }[]>(apiClient.getKeywordUsages(id!)),
    enabled: id !== null,
  })
}
```

- [ ] **Étape 4 : Vérifier TypeScript**

```bash
pnpm tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Étape 5 : Commit**

```bash
git add src/services/queryKeys.ts src/services/api.ts src/services/referenceQueries.ts
git commit -m "feat(services): updateKeyword + getKeywordUsages + useKeywordUsages"
```

---

## Tâche 3 : KeywordsPage + tests

**Fichiers :**
- Modifier : `src/features/admin/KeywordsPage.tsx`
- Modifier : `src/features/admin/__tests__/KeywordsPage.test.tsx`

**Interfaces consommées :**
- `useKeywords()` → `Keyword[]` où `Keyword = { id: number; mot: string; citation_count: number }`
- `useKeywordUsages(id: number | null)` → `{ data: { citation_id: number; titre: string }[], isFetching: boolean }`
- `apiClient.updateKeyword(id, mot)` via `useMutation`
- `queryKeys.keywords`, `queryKeys.keywordUsages`

- [ ] **Étape 1 : Écrire les tests d'abord**

Remplacer le contenu de `src/features/admin/__tests__/KeywordsPage.test.tsx` :

```tsx
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'
import { KeywordsPage } from '../KeywordsPage'

const MOCK_KEYWORDS = vi.hoisted(() => [
  { id: 1, mot: 'philosophie', citation_count: 0 },
  { id: 2, mot: 'éthique', citation_count: 3 },
  { id: 3, mot: 'littérature', citation_count: 0 },
])

const MOCK_USAGES = vi.hoisted(() => [
  { citation_id: 10, titre: 'La morale kantienne selon…' },
  { citation_id: 11, titre: 'Éthique et politique dans…' },
  { citation_id: 12, titre: 'Une approche pragmatique…' },
])

vi.mock('@/services/api', () => ({
  apiClient: {
    findKeywords: vi.fn().mockResolvedValue({ status: 'ok', data: MOCK_KEYWORDS, errors: [] }),
    createKeyword: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 4 }, errors: [] }),
    deleteKeyword: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
    updateKeyword: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 1 }, errors: [] }),
    getKeywordUsages: vi.fn().mockResolvedValue({ status: 'ok', data: MOCK_USAGES, errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { apiClient } from '@/services/api'

beforeEach(() => vi.clearAllMocks())

describe('KeywordsPage', () => {
  it('affiche la liste des mots-clés au chargement', async () => {
    renderWithClient(<KeywordsPage />)
    await waitFor(() => expect(screen.getByText('philosophie')).toBeInTheDocument())
    expect(screen.getByText('éthique')).toBeInTheDocument()
    expect(screen.getByText('littérature')).toBeInTheDocument()
  })

  it('filtre les mots-clés selon la recherche', async () => {
    renderWithClient(<KeywordsPage />)
    await waitFor(() => screen.getByText('philosophie'))
    await userEvent.type(screen.getByLabelText('Rechercher des mots-clés'), 'éth')
    expect(screen.getByText('éthique')).toBeInTheDocument()
    expect(screen.queryByText('philosophie')).not.toBeInTheDocument()
  })

  it('appelle createKeyword avec le bon mot', async () => {
    renderWithClient(<KeywordsPage />)
    await waitFor(() => screen.getByLabelText('Nouveau mot-clé'))
    await userEvent.type(screen.getByLabelText('Nouveau mot-clé'), 'poésie')
    await userEvent.click(screen.getByRole('button', { name: /ajouter/i }))
    await waitFor(() => expect(apiClient.createKeyword).toHaveBeenCalledWith({ mot: 'poésie' }))
  })

  it('appelle deleteKeyword après confirmation pour un mot-clé non utilisé', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    renderWithClient(<KeywordsPage />)
    await waitFor(() => screen.getByLabelText('Supprimer philosophie'))
    await userEvent.click(screen.getByLabelText('Supprimer philosophie'))
    await waitFor(() => expect(apiClient.deleteKeyword).toHaveBeenCalledWith(1))
  })

  it('affiche le compteur de mots-clés', async () => {
    renderWithClient(<KeywordsPage />)
    await waitFor(() => screen.getByText('philosophie'))
    expect(screen.getByText(/3 mots-clés/)).toBeInTheDocument()
  })

  it('affiche un badge entrées pour un mot-clé utilisé et pas de corbeille', async () => {
    renderWithClient(<KeywordsPage />)
    await waitFor(() => screen.getByText('éthique'))
    expect(screen.getByLabelText(/3 entrées utilisent éthique/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Supprimer éthique')).not.toBeInTheDocument()
  })

  it('ouvre le panneau usages au clic sur le badge', async () => {
    renderWithClient(<KeywordsPage />)
    await waitFor(() => screen.getByLabelText(/3 entrées utilisent éthique/))
    await userEvent.click(screen.getByLabelText(/3 entrées utilisent éthique/))
    await waitFor(() => expect(apiClient.getKeywordUsages).toHaveBeenCalledWith(2))
    await waitFor(() => screen.getByText(/La morale kantienne/))
  })

  it('appelle updateKeyword après édition au clavier', async () => {
    renderWithClient(<KeywordsPage />)
    await waitFor(() => screen.getByLabelText('Modifier philosophie'))
    await userEvent.click(screen.getByLabelText('Modifier philosophie'))
    const input = screen.getByLabelText('Modifier philosophie en cours')
    await userEvent.clear(input)
    await userEvent.type(input, 'philo')
    await userEvent.keyboard('{Enter}')
    await waitFor(() =>
      expect(apiClient.updateKeyword).toHaveBeenCalledWith(1, 'philo'),
    )
  })
})
```

- [ ] **Étape 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm test src/features/admin/__tests__/KeywordsPage.test.tsx --run
```

Résultat attendu : les 4 nouveaux tests échouent, les 5 anciens passent (avec les mocks mis à jour pour `citation_count`).

- [ ] **Étape 3 : Réécrire `KeywordsPage.tsx`**

Remplacer le contenu complet du fichier :

```tsx
import { useState, useRef } from 'react'
import { MagnifyingGlass, Plus, Trash, X, PencilSimple } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'
import { useKeywords, useKeywordUsages } from '@/services/referenceQueries'

type Keyword = { id: number; mot: string; citation_count: number }

export function KeywordsPage() {
  const qc = useQueryClient()
  const { data: allKeywords = [] } = useKeywords() as { data?: Keyword[] }

  const [search, setSearch] = useState('')
  const [newMot, setNewMot] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [openUsagesId, setOpenUsagesId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  const { data: usages = [], isFetching: usagesFetching } = useKeywordUsages(openUsagesId)

  const keywords = search.trim()
    ? allKeywords.filter((k) => k.mot.includes(search.trim().toLowerCase()))
    : allKeywords

  const createMut = useMutation({
    mutationFn: (payload: { mot: string }) => apiClient.createKeyword(payload),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Création impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.keywords })
      setNewMot('')
      inputRef.current?.focus()
      toast.success('Mot-clé ajouté.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient.deleteKeyword(id),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Suppression impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.keywords })
      toast.success('Mot-clé supprimé.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })

  const updateMut = useMutation({
    mutationFn: (vars: { id: number; mot: string }) => apiClient.updateKeyword(vars.id, vars.mot),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Modification impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.keywords })
      setEditingId(null)
      toast.success('Mot-clé modifié.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const mot = newMot.trim().toLowerCase()
    if (!mot) return
    createMut.mutate({ mot })
  }

  function handleDelete(id: number, mot: string) {
    if (!window.confirm(`Supprimer le mot-clé « ${mot} » ? Cette action est irréversible.`)) return
    deleteMut.mutate(id)
  }

  function startEdit(k: Keyword) {
    setEditingId(k.id)
    setEditValue(k.mot)
    setTimeout(() => {
      editRef.current?.focus()
      editRef.current?.select()
    }, 0)
  }

  function commitEdit() {
    if (editingId === null) return
    const mot = editValue.trim().toLowerCase()
    if (!mot) {
      setEditingId(null)
      return
    }
    updateMut.mutate({ id: editingId, mot })
  }

  function toggleUsages(id: number) {
    setOpenUsagesId(openUsagesId === id ? null : id)
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-(--color-text-primary)">Mots-clés</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">
        Gérez les mots-clés du corpus. Ils sont normalisés en minuscules.
      </p>

      <form onSubmit={handleAdd} className="mb-6 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newMot}
          onChange={(e) => setNewMot(e.target.value)}
          placeholder="Nouveau mot-clé…"
          aria-label="Nouveau mot-clé"
          className="rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
        />
        <button
          type="submit"
          disabled={!newMot.trim() || createMut.isPending}
          className="flex items-center gap-1.5 rounded-md bg-(--color-action) px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-action-hover) disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} weight="bold" aria-hidden="true" />
          Ajouter
        </button>
      </form>

      <div className="mb-4 flex items-center gap-2 rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 focus-within:ring-2 focus-within:ring-(--color-action)">
        <MagnifyingGlass size={16} className="shrink-0 text-(--color-text-placeholder)" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          aria-label="Rechercher des mots-clés"
          className="flex-1 bg-transparent text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Effacer la recherche">
            <X size={14} className="text-(--color-text-placeholder)" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="divide-y divide-(--color-border) rounded-lg border border-(--color-border)">
        {keywords.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-(--color-text-placeholder)">
            {search ? 'Aucun mot-clé correspondant.' : 'Aucun mot-clé.'}
          </p>
        ) : (
          keywords.map((k) => (
            <div key={k.id} className="group">
              <div className="flex items-center justify-between px-4 py-2 hover:bg-(--color-bg-button)">
                {editingId === k.id ? (
                  <input
                    ref={editRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={() => setEditingId(null)}
                    aria-label={`Modifier ${k.mot} en cours`}
                    className="flex-1 rounded border border-(--color-action) bg-(--color-bg-field) px-2 py-0.5 text-sm text-(--color-text-primary) focus-visible:outline-none"
                  />
                ) : (
                  <span className="text-sm text-(--color-text-primary)">{k.mot}</span>
                )}

                <div className="flex items-center gap-1">
                  {editingId !== k.id && (
                    <button
                      onClick={() => startEdit(k)}
                      className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 text-(--color-text-placeholder) hover:bg-(--color-bg-button) hover:text-(--color-text-primary)"
                      aria-label={`Modifier ${k.mot}`}
                    >
                      <PencilSimple size={14} aria-hidden="true" />
                    </button>
                  )}
                  {k.citation_count > 0 ? (
                    <button
                      onClick={() => toggleUsages(k.id)}
                      className="rounded px-2 py-0.5 text-xs font-medium text-(--color-text-secondary) hover:bg-(--color-bg-button)"
                      aria-label={`${k.citation_count} entrée${k.citation_count > 1 ? 's' : ''} utilisent ${k.mot}`}
                    >
                      {k.citation_count} entrée{k.citation_count > 1 ? 's' : ''}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(k.id, k.mot)}
                      className="rounded p-1 text-(--color-text-placeholder) transition-colors hover:bg-(--color-bg-button) hover:text-(--color-danger-text)"
                      aria-label={`Supprimer ${k.mot}`}
                    >
                      <Trash size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {openUsagesId === k.id && (
                <div className="border-t border-(--color-border) bg-(--color-bg-card) px-4 py-3">
                  {usagesFetching ? (
                    <p className="text-xs text-(--color-text-placeholder)">Chargement…</p>
                  ) : usages.length === 0 ? (
                    <p className="text-xs text-(--color-text-placeholder)">Aucune entrée trouvée.</p>
                  ) : (
                    <ul className="space-y-1">
                      {usages.map((u) => (
                        <li key={u.citation_id} className="text-xs text-(--color-text-secondary)">
                          <span className="font-mono text-(--color-text-placeholder)">
                            #{u.citation_id}
                          </span>{' '}
                          {u.titre}…
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <p className="mt-2 text-right text-xs text-(--color-text-placeholder)">
        {keywords.length} mot{keywords.length !== 1 ? 's' : ''}-clé
        {keywords.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
```

- [ ] **Étape 4 : Lancer les tests**

```bash
pnpm test src/features/admin/__tests__/KeywordsPage.test.tsx --run
```

Résultat attendu : 9/9 tests passent.

- [ ] **Étape 5 : Vérifier TypeScript**

```bash
pnpm tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Étape 6 : Corriger le formatage**

```bash
pnpm prettier --write src/features/admin/KeywordsPage.tsx src/features/admin/__tests__/KeywordsPage.test.tsx
```

- [ ] **Étape 7 : Commit**

```bash
git add src/features/admin/KeywordsPage.tsx src/features/admin/__tests__/KeywordsPage.test.tsx
git commit -m "feat(admin): mots-clés — surbrillance, édition inline, suppression protégée"
```
