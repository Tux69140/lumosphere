# Lier une œuvre à sa source de collecte — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher la source de collecte liée dans la fiche œuvre admin, et permettre de modifier ce lien via un menu déroulant.

**Architecture:** La colonne `oeuvre_id` existe déjà dans `collect_sources`. On enrichit le DAL oeuvres (LEFT JOIN), on crée un DAL + endpoint `collect_sources` (lecture seule), et on ajoute un endpoint d'action `POST /api/oeuvres/{id}/source` dans l'endpoint oeuvres existant. Côté front, la couche services reçoit deux nouvelles méthodes dans `apiClient` et un nouveau hook dans `referenceQueries`.

**Tech Stack:** PHP 8.1 / PDO / MariaDB, React 19 / TypeScript / TanStack Query, Vitest / Testing Library

## Global Constraints

- Couche d'abstraction obligatoire : les composants React appellent `useCollectSources()` ou `useMutation` wrappant `apiClient.*` — jamais `fetch` directement.
- Toute mutation PHP vérifie le CSRF (géré automatiquement par `apiClient.post()`).
- Permission `oeuvres.manage` requise pour écriture ; `corpus.read` pour lecture des œuvres.
- PDO bound parameters uniquement — jamais de concaténation SQL.
- Nommage PHP : `snake_case`, fonctions préfixées `dal_` (DAL) ou `endpoint_` (endpoint).

---

## Fichiers touchés

| Fichier | Statut |
|---------|--------|
| `api/dal/oeuvres.php` | Modifié — LEFT JOIN collect_sources dans `dal_find_oeuvres` et `dal_get_oeuvre` |
| `api/dal/collect_sources.php` | Créé — `dal_find_collect_sources()` + `dal_link_oeuvre_source()` |
| `api/endpoints/collect_sources.php` | Créé — GET liste des sources |
| `api/endpoints/oeuvres.php` | Modifié — case `action === 'source'` |
| `src/services/queryKeys.ts` | Modifié — clé `collectSources` |
| `src/services/api.ts` | Modifié — `findCollectSources()` + `linkOeuvreSource()` |
| `src/services/referenceQueries.ts` | Modifié — `useCollectSources()` |
| `src/features/admin/OeuvresPage.tsx` | Modifié — type Oeuvre étendu + section source |
| `src/features/admin/__tests__/OeuvresPage.test.tsx` | Modifié — mock étendu + test liaison |

---

## Tâche 1 : Backend PHP

**Fichiers :**
- Modifier : `api/dal/oeuvres.php`
- Créer : `api/dal/collect_sources.php`
- Créer : `api/endpoints/collect_sources.php`
- Modifier : `api/endpoints/oeuvres.php`

**Interfaces produites :**
- `GET /api/collect_sources` → `[{ id, label, source_type }]`
- `POST /api/oeuvres/{id}/source` body `{ source_id: number|null }` → `{ status: 'ok' }`
- `GET /api/oeuvres` enrichi → chaque œuvre inclut `source_id: int|null, source_label: string|null`

- [ ] **Étape 1 : Enrichir `dal_find_oeuvres` avec LEFT JOIN**

Dans `api/dal/oeuvres.php`, remplacer le SELECT de `dal_find_oeuvres` :

```php
$sql = "SELECT o.id, o.auteur_id, o.nom, o.abreviation, o.url, o.ref_libraire, o.description,
               o.created_at, o.updated_at, a.nom AS auteur_nom,
               cs.id AS source_id, cs.label AS source_label
        FROM oeuvres o
        JOIN auteurs a ON o.auteur_id = a.id
        LEFT JOIN collect_sources cs ON cs.oeuvre_id = o.id
        WHERE {$where}
        ORDER BY o.nom";
```

Faire de même dans `dal_get_oeuvre` (même SELECT étendu, même LEFT JOIN).

- [ ] **Étape 2 : Vérifier syntaxe PHP**

```bash
php -l api/dal/oeuvres.php
```

Résultat attendu : `No syntax errors detected`

- [ ] **Étape 3 : Créer `api/dal/collect_sources.php`**

```php
<?php

declare(strict_types=1);

function dal_find_collect_sources(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'oeuvres.manage');
    $stmt = $pdo->query(
        'SELECT id, label, source_type FROM collect_sources ORDER BY label'
    );
    return dal_ok($stmt->fetchAll());
}

function dal_link_oeuvre_source(PDO $pdo, array $ctx, int $oeuvre_id, ?int $source_id): array
{
    dal_require_permission($ctx, 'oeuvres.manage');

    $stmt = $pdo->prepare('SELECT id FROM oeuvres WHERE id = :id');
    $stmt->execute(['id' => $oeuvre_id]);
    if (!$stmt->fetch()) {
        return dal_error('Œuvre introuvable.');
    }

    if ($source_id !== null) {
        $stmt = $pdo->prepare('SELECT id FROM collect_sources WHERE id = :id');
        $stmt->execute(['id' => $source_id]);
        if (!$stmt->fetch()) {
            return dal_error('Source introuvable.');
        }
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE collect_sources SET oeuvre_id = NULL WHERE oeuvre_id = :oeuvre_id')
            ->execute(['oeuvre_id' => $oeuvre_id]);

        if ($source_id !== null) {
            $pdo->prepare('UPDATE collect_sources SET oeuvre_id = :oeuvre_id WHERE id = :id')
                ->execute(['oeuvre_id' => $oeuvre_id, 'id' => $source_id]);
        }

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    return dal_ok();
}
```

- [ ] **Étape 4 : Vérifier syntaxe PHP**

```bash
php -l api/dal/collect_sources.php
```

Résultat attendu : `No syntax errors detected`

- [ ] **Étape 5 : Créer `api/endpoints/collect_sources.php`**

```php
<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/collect_sources.php';

function endpoint_collect_sources(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET' && $id === null => dal_find_collect_sources($pdo, $ctx),
        default                           => dal_error('Méthode non supportée.'),
    };
}
```

- [ ] **Étape 6 : Vérifier syntaxe PHP**

```bash
php -l api/endpoints/collect_sources.php
```

Résultat attendu : `No syntax errors detected`

- [ ] **Étape 7 : Modifier `api/endpoints/oeuvres.php`** — ajouter le case `source`

```php
<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/oeuvres.php';
require_once dirname(__DIR__) . '/dal/collect_sources.php';

function endpoint_oeuvres(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET'  && $id === null                            => dal_find_oeuvres($pdo, $ctx, isset($_GET['auteur_id']) ? (int) $_GET['auteur_id'] : null),
        $method === 'GET'  && $id !== null                            => dal_get_oeuvre($pdo, $ctx, $id),
        $method === 'POST' && $id === null                            => dal_create_oeuvre($pdo, $ctx, $body ?? []),
        $method === 'POST' && $id !== null && $action === 'source'    => dal_link_oeuvre_source($pdo, $ctx, $id, isset($body['source_id']) ? ($body['source_id'] === null ? null : (int) $body['source_id']) : null),
        $method === 'PUT'  && $id !== null                            => dal_update_oeuvre($pdo, $ctx, $id, $body ?? []),
        $method === 'DELETE' && $id !== null                          => dal_delete_oeuvre($pdo, $ctx, $id),
        default                                                       => dal_error('Méthode non supportée.'),
    };
}
```

- [ ] **Étape 8 : Vérifier syntaxe PHP**

```bash
php -l api/endpoints/oeuvres.php
```

Résultat attendu : `No syntax errors detected`

- [ ] **Étape 9 : Commit**

```bash
git add api/dal/oeuvres.php api/dal/collect_sources.php api/endpoints/collect_sources.php api/endpoints/oeuvres.php
git commit -m "feat(api): collect_sources lecture + liaison oeuvre/source"
```

---

## Tâche 2 : Couche services frontend

**Fichiers :**
- Modifier : `src/services/queryKeys.ts`
- Modifier : `src/services/api.ts`
- Modifier : `src/services/referenceQueries.ts`

**Interfaces consommées :** endpoints PHP de la Tâche 1
**Interfaces produites :**
- `queryKeys.collectSources` = `['collectSources'] as const`
- `apiClient.findCollectSources()` → `Promise<ApiResponse<CollectSource[]>>`
- `apiClient.linkOeuvreSource(oeuvreId, sourceId|null)` → `Promise<ApiResponse<void>>`
- `useCollectSources()` → `UseQueryResult<CollectSource[]>`

- [ ] **Étape 1 : Ajouter la clé dans `queryKeys.ts`**

Ajouter à la fin de l'objet `queryKeys` (avant le `}`) :

```ts
  collectSources: ['collectSources'] as const,
```

- [ ] **Étape 2 : Ajouter les méthodes dans `api.ts`**

Chercher le bloc des méthodes `oeuvres` (lignes ~175-179). Après `deleteOeuvre`, ajouter :

```ts
  findCollectSources: () => get<unknown[]>('collect_sources'),
  linkOeuvreSource: (oeuvreId: number, sourceId: number | null) =>
    post<void>(`oeuvres/${oeuvreId}/source`, { source_id: sourceId }),
```

- [ ] **Étape 3 : Ajouter le hook dans `referenceQueries.ts`**

Après le hook `useOeuvres`, ajouter :

```ts
export type CollectSource = { id: number; label: string; source_type: string }

export function useCollectSources() {
  return useQuery({
    queryKey: queryKeys.collectSources,
    queryFn: () => unwrap<CollectSource[]>(apiClient.findCollectSources()),
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
git commit -m "feat(services): findCollectSources + linkOeuvreSource + useCollectSources"
```

---

## Tâche 3 : OeuvresPage — section source

**Fichiers :**
- Modifier : `src/features/admin/OeuvresPage.tsx`
- Modifier : `src/features/admin/__tests__/OeuvresPage.test.tsx`

**Interfaces consommées :**
- `useCollectSources()` → `CollectSource[]` depuis `referenceQueries.ts`
- `apiClient.linkOeuvreSource(oeuvreId, sourceId|null)` depuis `api.ts`
- `queryKeys.collectSources` et `queryKeys.oeuvres` depuis `queryKeys.ts`

- [ ] **Étape 1 : Écrire le test d'abord**

Remplacer le contenu de `src/features/admin/__tests__/OeuvresPage.test.tsx` :

```tsx
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'
import { OeuvresPage } from '../OeuvresPage'

const OEUVRES = vi.hoisted(() => [
  {
    id: 1,
    nom: 'ebook',
    auteur_id: 5,
    auteur_nom: 'Lulumineuse',
    abreviation: null,
    url: null,
    ref_libraire: null,
    description: null,
    source_id: 2,
    source_label: 'Lulumineuse',
  },
])
const AUTEURS = vi.hoisted(() => [{ id: 5, nom: 'Lulumineuse' }])
const SOURCES = vi.hoisted(() => [
  { id: 2, label: 'Lulumineuse', source_type: 'telegram' },
  { id: 3, label: 'Stéphane', source_type: 'telegram' },
])

vi.mock('@/services/api', () => ({
  apiClient: {
    findOeuvres: vi.fn().mockResolvedValue({ status: 'ok', data: OEUVRES, errors: [] }),
    findAuteurs: vi.fn().mockResolvedValue({ status: 'ok', data: AUTEURS, errors: [] }),
    findCollectSources: vi.fn().mockResolvedValue({ status: 'ok', data: SOURCES, errors: [] }),
    createOeuvre: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 2 }, errors: [] }),
    updateOeuvre: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 1 }, errors: [] }),
    deleteOeuvre: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
    linkOeuvreSource: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
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
      expect(apiClient.createOeuvre).toHaveBeenCalledWith(
        expect.objectContaining({ nom: 'Articles', auteur_id: 5 }),
      ),
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

  it('affiche la source liée et appelle linkOeuvreSource au changement', async () => {
    renderWithClient(<OeuvresPage />)
    await waitFor(() => screen.getByTestId('oeuvre-item-1'))
    await userEvent.click(screen.getByTestId('oeuvre-item-1'))
    await waitFor(() => screen.getByLabelText('Source de collecte'))
    const select = screen.getByLabelText('Source de collecte')
    expect(select).toHaveValue('2')
    await userEvent.selectOptions(select, '3')
    await waitFor(() =>
      expect(apiClient.linkOeuvreSource).toHaveBeenCalledWith(1, 3),
    )
  })

  it('appelle linkOeuvreSource avec null pour délier', async () => {
    renderWithClient(<OeuvresPage />)
    await waitFor(() => screen.getByTestId('oeuvre-item-1'))
    await userEvent.click(screen.getByTestId('oeuvre-item-1'))
    await waitFor(() => screen.getByLabelText('Source de collecte'))
    await userEvent.selectOptions(screen.getByLabelText('Source de collecte'), '')
    await waitFor(() =>
      expect(apiClient.linkOeuvreSource).toHaveBeenCalledWith(1, null),
    )
  })
})
```

- [ ] **Étape 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm test src/features/admin/__tests__/OeuvresPage.test.tsx --run
```

Résultat attendu : les 2 nouveaux tests échouent (`linkOeuvreSource` et `source de collecte`), les 3 anciens passent.

- [ ] **Étape 3 : Modifier `OeuvresPage.tsx`**

Remplacer le contenu complet du fichier :

```tsx
import { useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'
import { useOeuvres, useAuteurs, useCollectSources } from '@/services/referenceQueries'

type Oeuvre = {
  id: number
  nom: string
  auteur_id: number
  auteur_nom: string | null
  abreviation: string | null
  url: string | null
  ref_libraire: string | null
  description: string | null
  source_id: number | null
  source_label: string | null
}

type Auteur = { id: number; nom: string }

const schema = z.object({
  nom: z.string().min(1, 'Le nom est requis.'),
  auteur_id: z.number().int().positive("L'auteur est requis."),
  abreviation: z.string().optional(),
  url: z.string().url('URL invalide.').or(z.literal('')).optional(),
  ref_libraire: z.string().optional(),
  description: z.string().optional(),
})

type FormState = {
  nom: string
  auteur_id: string
  abreviation: string
  url: string
  ref_libraire: string
  description: string
}

const emptyForm: FormState = {
  nom: '',
  auteur_id: '',
  abreviation: '',
  url: '',
  ref_libraire: '',
  description: '',
}

export function OeuvresPage() {
  const qc = useQueryClient()
  const { data: oeuvres = [] } = useOeuvres() as { data?: Oeuvre[] }
  const { data: auteurs = [] } = useAuteurs() as { data?: Auteur[] }
  const { data: sources = [] } = useCollectSources()

  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null)

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.createOeuvre(payload),
    onSuccess: (r) => {
      if (r.status !== 'ok') { toast.error(r.errors?.[0] ?? 'Création impossible.'); return }
      qc.invalidateQueries({ queryKey: queryKeys.oeuvres })
      setSelectedId((r.data as { id: number }).id)
      toast.success('Œuvre créée.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })
  const updateMut = useMutation({
    mutationFn: (vars: { id: number; payload: Record<string, unknown> }) =>
      apiClient.updateOeuvre(vars.id, vars.payload),
    onSuccess: (r) => {
      if (r.status !== 'ok') { toast.error(r.errors?.[0] ?? 'Modification impossible.'); return }
      qc.invalidateQueries({ queryKey: queryKeys.oeuvres })
      toast.success('Modifications enregistrées.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient.deleteOeuvre(id),
    onSuccess: (r) => {
      if (r.status !== 'ok') { toast.error(r.errors?.[0] ?? 'Suppression impossible.'); return }
      qc.invalidateQueries({ queryKey: queryKeys.oeuvres })
      setSelectedId(null)
      setForm(emptyForm)
      toast.success('Œuvre supprimée.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })
  const linkMut = useMutation({
    mutationFn: (vars: { oeuvreId: number; sourceId: number | null }) =>
      apiClient.linkOeuvreSource(vars.oeuvreId, vars.sourceId),
    onSuccess: (r) => {
      if (r.status !== 'ok') { toast.error(r.errors?.[0] ?? 'Association impossible.'); return }
      qc.invalidateQueries({ queryKey: queryKeys.oeuvres })
      qc.invalidateQueries({ queryKey: queryKeys.collectSources })
      toast.success('Source associée.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })

  const saving = createMut.isPending || updateMut.isPending

  function selectOeuvre(id: number) {
    const found = oeuvres.find((o) => o.id === id)
    if (!found) return
    setSelectedId(id)
    setForm({
      nom: found.nom,
      auteur_id: String(found.auteur_id),
      abreviation: found.abreviation ?? '',
      url: found.url ?? '',
      ref_libraire: found.ref_libraire ?? '',
      description: found.description ?? '',
    })
    setSelectedSourceId(found.source_id)
    setErrors({})
  }

  function startNew() {
    setSelectedId('new')
    setForm(emptyForm)
    setSelectedSourceId(null)
    setErrors({})
  }

  async function handleSave() {
    const parsed = schema.safeParse({
      ...form,
      auteur_id: form.auteur_id ? parseInt(form.auteur_id, 10) : undefined,
    })
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {}
      for (const issue of parsed.error.issues)
        fieldErrors[issue.path[0] as keyof FormState] = issue.message
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

  function handleSourceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (typeof selectedId !== 'number') return
    const sourceId = e.target.value ? parseInt(e.target.value, 10) : null
    setSelectedSourceId(sourceId)
    linkMut.mutate({ oeuvreId: selectedId, sourceId })
  }

  const showPanel = selectedId !== null

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-(--color-text-primary)">Œuvres</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">Gérez les œuvres du corpus.</p>
      <div className="flex min-h-[500px] overflow-hidden rounded-lg border border-(--color-border)">
        <aside className="flex w-64 shrink-0 flex-col">
          <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-3">
            <h2 className="text-sm font-semibold text-(--color-text-primary)">Œuvres</h2>
            <button
              onClick={startNew}
              className="rounded-md p-1 text-(--color-text-placeholder) transition-colors hover:bg-(--color-bg-button) hover:text-(--color-text-primary)"
              title="Créer une œuvre"
              aria-label="Créer une nouvelle œuvre"
            >
              <Plus size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {oeuvres.map((o) => (
              <button
                key={o.id}
                data-testid={`oeuvre-item-${o.id}`}
                onClick={() => selectOeuvre(o.id)}
                className={[
                  'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                  selectedId === o.id
                    ? 'bg-(--color-accent-bg) font-medium text-(--color-text-primary)'
                    : 'text-(--color-text-secondary) hover:bg-(--color-bg-button) hover:text-(--color-text-primary)',
                ].join(' ')}
              >
                <span className="block truncate">{o.nom}</span>
                {o.auteur_nom && (
                  <span className="block truncate text-xs text-(--color-text-placeholder)">
                    {o.auteur_nom}
                  </span>
                )}
              </button>
            ))}
            {selectedId === 'new' && (
              <div className="rounded-md bg-(--color-accent-bg) px-3 py-2 text-sm font-medium text-(--color-text-placeholder)">
                Nouvelle œuvre…
              </div>
            )}
          </nav>
        </aside>

        <div className="flex-1 overflow-y-auto border-l border-(--color-border)">
          {!showPanel ? (
            <div className="flex h-full items-center justify-center text-sm text-(--color-text-placeholder)">
              Sélectionnez une œuvre ou créez-en une nouvelle
            </div>
          ) : (
            <div className="p-6">
              <div className="grid max-w-lg gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-(--color-text-primary)" htmlFor="oeuvre-nom">
                    Titre <span className="text-(--color-danger-text)">*</span>
                  </label>
                  <input
                    id="oeuvre-nom"
                    type="text"
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    placeholder="Ex : Le Deuxième Sexe"
                    aria-label="Titre de l'œuvre"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                  />
                  {errors.nom && <p className="mt-1 text-xs text-(--color-danger-text)">{errors.nom}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-(--color-text-primary)" htmlFor="oeuvre-auteur">
                    Auteur <span className="text-(--color-danger-text)">*</span>
                  </label>
                  <select
                    id="oeuvre-auteur"
                    value={form.auteur_id}
                    onChange={(e) => setForm((f) => ({ ...f, auteur_id: e.target.value }))}
                    aria-label="Auteur de l'œuvre"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                  >
                    <option value="">— Choisir un auteur —</option>
                    {auteurs.map((a) => (
                      <option key={a.id} value={a.id}>{a.nom}</option>
                    ))}
                  </select>
                  {errors.auteur_id && <p className="mt-1 text-xs text-(--color-danger-text)">{errors.auteur_id}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-(--color-text-primary)" htmlFor="oeuvre-abreviation">
                    Abréviation
                  </label>
                  <input
                    id="oeuvre-abreviation"
                    type="text"
                    value={form.abreviation}
                    onChange={(e) => setForm((f) => ({ ...f, abreviation: e.target.value }))}
                    aria-label="Abréviation de l'œuvre"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-(--color-text-primary)" htmlFor="oeuvre-url">
                    URL
                  </label>
                  <input
                    id="oeuvre-url"
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://…"
                    aria-label="URL de l'œuvre"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                  />
                  {errors.url && <p className="mt-1 text-xs text-(--color-danger-text)">{errors.url}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-(--color-text-primary)" htmlFor="oeuvre-ref">
                    Réf. libraire
                  </label>
                  <input
                    id="oeuvre-ref"
                    type="text"
                    value={form.ref_libraire}
                    onChange={(e) => setForm((f) => ({ ...f, ref_libraire: e.target.value }))}
                    aria-label="Référence libraire"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-(--color-text-primary)" htmlFor="oeuvre-description">
                    Description
                  </label>
                  <textarea
                    id="oeuvre-description"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    aria-label="Description de l'œuvre"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                  />
                </div>

                {typeof selectedId === 'number' && (
                  <div className="border-t border-(--color-border) pt-4">
                    <label className="mb-1 block text-sm font-medium text-(--color-text-primary)" htmlFor="oeuvre-source">
                      Source de collecte
                    </label>
                    <select
                      id="oeuvre-source"
                      value={selectedSourceId ?? ''}
                      onChange={handleSourceChange}
                      disabled={linkMut.isPending}
                      aria-label="Source de collecte"
                      className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action) disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">— Aucune —</option>
                      {sources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label} — {s.source_type}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-(--color-border) pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md bg-(--color-action) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-action-hover) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                {typeof selectedId === 'number' && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 text-sm text-(--color-danger-text) hover:underline"
                  >
                    <Trash size={14} aria-hidden="true" />
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Étape 4 : Lancer les tests**

```bash
pnpm test src/features/admin/__tests__/OeuvresPage.test.tsx --run
```

Résultat attendu : 5/5 tests passent.

- [ ] **Étape 5 : Vérifier TypeScript**

```bash
pnpm tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Étape 6 : Commit**

```bash
git add src/features/admin/OeuvresPage.tsx src/features/admin/__tests__/OeuvresPage.test.tsx
git commit -m "feat(admin): liaison oeuvre/source dans la fiche œuvre"
```
