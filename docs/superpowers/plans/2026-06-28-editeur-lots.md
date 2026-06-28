# Poste de travail d'édition des lots — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer le `DetailLot` en un vrai poste de travail d'édition : éditeur riche Milkdown, layout 75%/25% (texte/métadonnées), fusion de posts, date modifiable, oeuvre héritée du lot.

**Architecture:** Le `DocumentCard` existant est réécrit avec un layout en 2 colonnes (éditeur gauche, métadonnées sticky à droite). Le backend reçoit un nouvel endpoint DELETE pour la suppression de documents (nécessaire à la fusion). Le composant `MarkdownEditor` (façade Milkdown, déjà lazy-loaded) remplace le `<textarea>`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, TanStack Query, Milkdown (via `MarkdownEditor`), PHP 8.1 (DAL + endpoint)

## Global Constraints

- UI labels en français avec accents corrects
- Icons : Phosphor Icons uniquement
- `credentials: 'include'` sur tout fetch (via `apiClient`)
- CSRF token sur mutations (géré par `apiClient`)
- PDO bound parameters (jamais de concaténation SQL)
- Pas de commentaires sauf si le "pourquoi" est non-évident

---

### Task 1: Backend — Suppression de document + type TS

**Files:**
- Modify: `api/dal/lots.php` (ajouter `dal_delete_lot_document()` après la fonction `dal_set_lot_document_keywords` ~ligne 309)
- Modify: `api/endpoints/lots.php` (ajouter route DELETE document dans le `match`)
- Modify: `src/features/atelier/types.ts` (ajouter `date_publication` au type `LotDocument`)
- Modify: `src/services/api.ts` (ajouter `deleteLotDocument`)
- Modify: `src/features/atelier/useLots.ts` (ajouter `useDeleteLotDocument`)

**Interfaces:**
- Consumes: `dal_require_permission()` from `core.php`, `dal_ok()`/`dal_error()` from `core.php`
- Produces: `dal_delete_lot_document(PDO $pdo, array $ctx, int $doc_id): array` — returns `dal_ok()` or `dal_error()`
- Produces: `apiClient.deleteLotDocument(lotId: number, docId: number): Promise<ApiResponse<void>>`
- Produces: `useDeleteLotDocument(): UseMutationResult` — invalidates `lotDetail` and `lotsAll`

- [ ] **Step 1: Add `dal_delete_lot_document` to the PHP DAL**

In `api/dal/lots.php`, add after the `dal_set_lot_document_keywords` function (after line 309):

```php
function dal_delete_lot_document(PDO $pdo, array $ctx, int $doc_id): array
{
    dal_require_permission($ctx, 'atelier.lots');

    $stmt = $pdo->prepare('SELECT id, lot_id FROM documents WHERE id = :id');
    $stmt->execute(['id' => $doc_id]);
    $doc = $stmt->fetch();
    if (!$doc) {
        return dal_error('Document introuvable.');
    }

    $pdo->prepare('DELETE FROM lot_document_keywords WHERE document_id = :did')
        ->execute(['did' => $doc_id]);
    $pdo->prepare('DELETE FROM documents WHERE id = :id')
        ->execute(['id' => $doc_id]);

    return dal_ok(['id' => $doc_id]);
}
```

- [ ] **Step 2: Add DELETE route to the endpoint**

In `api/endpoints/lots.php`, add a new case in the `match` block, before the `default =>` line:

```php
        // DELETE /api/lots/{id}/document — supprimer un document du lot
        $method === 'DELETE' && $id !== null && $action === 'document' =>
            dal_delete_lot_document($pdo, $ctx, (int) ($body['document_id'] ?? 0)),
```

- [ ] **Step 3: Verify PHP syntax**

Run: `php -l api/dal/lots.php && php -l api/endpoints/lots.php`
Expected: `No syntax errors detected` for both files.

- [ ] **Step 4: Add `date_publication` to TypeScript type**

In `src/features/atelier/types.ts`, add `date_publication` to the `LotDocument` type, after the `citation_id` field:

```typescript
export type LotDocument = {
  id: number
  lot_id: number
  filename: string
  type_document: DocumentType
  status: LotStatus
  source_item_id: string | null
  contenu_brut: string | null
  contenu_revise: string | null
  hash_contenu: string | null
  selected: boolean
  theme_id: number | null
  theme_nom: string | null
  oeuvre_id: number | null
  oeuvre_nom: string | null
  citation_id: number | null
  date_publication: string | null
  keywords: DocumentKeyword[]
  created_at: string
  updated_at: string
}
```

- [ ] **Step 5: Add `deleteLotDocument` to API client**

In `src/services/api.ts`, add after the `setLotDocumentKeywords` method (line 270):

```typescript
  deleteLotDocument: (lotId: number, docId: number) =>
    delWithBody<void>(`lots/${lotId}/document`, { document_id: docId }),
```

- [ ] **Step 6: Add `useDeleteLotDocument` hook**

In `src/features/atelier/useLots.ts`, add after the `useSetDocumentKeywords` function:

```typescript
export function useDeleteLotDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ lotId, docId }: { lotId: number; docId: number }) =>
      apiClient.deleteLotDocument(lotId, docId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.lotDetail(vars.lotId) })
      qc.invalidateQueries({ queryKey: queryKeys.lotsAll })
    },
  })
}
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add api/dal/lots.php api/endpoints/lots.php src/features/atelier/types.ts src/services/api.ts src/features/atelier/useLots.ts
git commit -m "feat(atelier): add DELETE document endpoint + date_publication type + useDeleteLotDocument hook"
```

---

### Task 2: Rewrite DetailLot — layout 75/25 with Milkdown

**Files:**
- Rewrite: `src/features/atelier/components/DetailLot.tsx`

**Interfaces:**
- Consumes: `MarkdownEditor` from `@/components/MarkdownEditor` (props: `value: string`, `onChange: (md: string) => void`)
- Consumes: `useDeleteLotDocument()` from `../useLots` (Task 1)
- Consumes: `apiClient.deleteLotDocument()` from `@/services/api` (Task 1)
- Consumes: `LotDocument.date_publication` field (Task 1)
- Consumes: existing hooks `useUpdateLotStatus`, `useCheckConformity`, `useIntegrateLot`, `useUpdateLotDocument`, `useSetDocumentKeywords` from `../useLots`
- Consumes: `useThemes()`, `useOeuvres()` from `@/services/referenceQueries`
- Consumes: `apiClient.aiSuggestKeywords()`, `apiClient.aiSuggestTheme()`, `apiClient.findOrCreateKeyword()` from `@/services/api`
- Produces: same exported `DetailLot` component with same `Props` type — drop-in replacement

- [ ] **Step 1: Plan the component structure**

The rewritten `DetailLot.tsx` has two internal components:

1. `LotHeader` — lot title, status badge, transitions, oeuvre selector, counters, conformity/integration buttons
2. `DocumentCard` — one per post, with 2-column layout:
   - Left 75%: header (message id + date input + Inclus/Exclu + Fusionner ↑), MarkdownEditor, save button
   - Right 25% sticky: theme select + AI, oeuvre select (pre-filled from lot), keywords + AI

- [ ] **Step 2: Write the complete rewritten file**

Replace the entire contents of `src/features/atelier/components/DetailLot.tsx` with the following. This is a full rewrite — do NOT try to edit individual sections of the existing file; overwrite the whole file.

```tsx
import { useState, useCallback } from 'react'
import {
  ArrowRight,
  ArrowLineUp,
  CheckCircle,
  WarningCircle,
  Eye,
  EyeSlash,
  Tag,
  X,
  Sparkle,
  FloppyDisk,
  TreeStructure,
} from '@phosphor-icons/react'
import type { LotDetail, LotDocument, LotStatus, ConformityResult } from '../types'
import { LOT_STATUS_LABELS, LOT_STATUS_COLORS, LOT_VALID_TRANSITIONS } from '../types'
import {
  useUpdateLotStatus,
  useCheckConformity,
  useIntegrateLot,
  useUpdateLotDocument,
  useDeleteLotDocument,
} from '../useLots'
import { useThemes, useOeuvres } from '@/services/referenceQueries'
import { apiClient } from '@/services/api'
import { BlocErreur } from './BlocErreur'
import { MarkdownEditor } from '@/components/MarkdownEditor'

type Props = {
  lot: LotDetail
  onKeywordsAccepted: (docId: number, keywordIds: number[]) => void
}

function toDateInput(raw: string | null | undefined): string {
  if (!raw) return ''
  const d = new Date(raw)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function formatDateFr(raw: string | null | undefined): string {
  if (!raw) return ''
  const d = new Date(raw)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR')
}

// ── Panneau métadonnées (colonne droite sticky) ─────────────────

function MetadataPanel({
  doc,
  lot,
  themes,
  oeuvres,
  onUpdate,
  onKeywordsAccepted,
}: {
  doc: LotDocument
  lot: LotDetail
  themes: Array<{ id: number; nom: string; parent_id?: number | null }>
  oeuvres: Array<{ id: number; nom: string }>
  onUpdate: (data: Record<string, unknown>) => void
  onKeywordsAccepted: (keywordIds: number[]) => void
}) {
  const [aiKwLoading, setAiKwLoading] = useState(false)
  const [aiThemeLoading, setAiThemeLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState('')

  const text = doc.contenu_revise || doc.contenu_brut || ''

  async function handleAiSuggestKeywords() {
    if (!text.trim()) return
    setAiKwLoading(true)
    try {
      const res = await apiClient.aiSuggestKeywords(doc.id, text)
      if (res.status === 'ok' && res.data?.keywords) {
        const existing = new Set(doc.keywords.map((k) => k.mot.toLowerCase()))
        setAiSuggestions(res.data.keywords.filter((kw: string) => !existing.has(kw.toLowerCase())))
      }
    } catch {
      /* ignore */
    } finally {
      setAiKwLoading(false)
    }
  }

  async function handleAiSuggestTheme() {
    if (!text.trim()) return
    setAiThemeLoading(true)
    try {
      const res = await apiClient.aiSuggestTheme(doc.id, text)
      if (res.status === 'ok' && res.data?.theme_id) {
        onUpdate({ document_id: doc.id, theme_id: res.data.theme_id })
      }
    } catch {
      /* ignore */
    } finally {
      setAiThemeLoading(false)
    }
  }

  async function handleAcceptSuggestion(mot: string) {
    const res = await apiClient.findOrCreateKeyword(mot)
    if (res.status === 'ok' && res.data) {
      onKeywordsAccepted([res.data.id])
      setAiSuggestions((prev) => prev.filter((s) => s !== mot))
    }
  }

  async function handleAddKeyword() {
    if (!newKeyword.trim()) return
    const res = await apiClient.findOrCreateKeyword(newKeyword.trim())
    if (res.status === 'ok' && res.data) {
      onKeywordsAccepted([res.data.id])
      setNewKeyword('')
    }
  }

  function handleRemoveKeyword(kwId: number) {
    const remaining = doc.keywords.filter((k) => k.keyword_id !== kwId).map((k) => k.keyword_id)
    apiClient.setLotDocumentKeywords(lot.id, remaining, 'manual')
  }

  return (
    <div className="space-y-4">
      {/* Thème */}
      <div>
        <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-(--color-text-muted)">
          Thème
          <button
            type="button"
            onClick={handleAiSuggestTheme}
            disabled={aiThemeLoading || !text.trim()}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-(--color-accent) transition-colors hover:bg-(--color-bg-hover) disabled:opacity-40"
            title="Suggestion IA du thème"
          >
            <TreeStructure size={12} weight="fill" />
            {aiThemeLoading ? '...' : 'IA'}
          </button>
        </label>
        <select
          value={doc.theme_id ?? ''}
          onChange={(e) =>
            onUpdate({
              document_id: doc.id,
              theme_id: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="w-full rounded-md border border-(--color-border) bg-(--color-bg-card) px-2 py-1.5 text-sm text-(--color-text)"
        >
          <option value="">— Thème —</option>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.parent_id ? '└ ' : ''}
              {t.nom}
            </option>
          ))}
        </select>
      </div>

      {/* Œuvre */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-(--color-text-muted)">Œuvre</label>
        <select
          value={doc.oeuvre_id ?? ''}
          onChange={(e) =>
            onUpdate({
              document_id: doc.id,
              oeuvre_id: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="w-full rounded-md border border-(--color-border) bg-(--color-bg-card) px-2 py-1.5 text-sm text-(--color-text)"
        >
          <option value="">— Œuvre —</option>
          {oeuvres.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nom}
            </option>
          ))}
        </select>
      </div>

      {/* Mots-clés */}
      <div>
        <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-(--color-text-muted)">
          Mots-clés
          <button
            type="button"
            onClick={handleAiSuggestKeywords}
            disabled={aiKwLoading || !text.trim()}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-(--color-accent) transition-colors hover:bg-(--color-bg-hover) disabled:opacity-40"
            title="Suggestions IA de mots-clés"
          >
            <Sparkle size={12} weight="fill" />
            {aiKwLoading ? '...' : 'IA'}
          </button>
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {doc.keywords.map((kw) => (
            <span
              key={kw.keyword_id}
              className="inline-flex items-center gap-1 rounded-full bg-(--color-tag-bg) px-2 py-0.5 text-xs text-(--color-tag-text)"
            >
              <Tag size={10} />
              {kw.mot}
              <button
                type="button"
                onClick={() => handleRemoveKeyword(kw.keyword_id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-red-200 dark:hover:bg-red-800"
                aria-label={`Retirer ${kw.mot}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}

          {aiSuggestions.map((mot) => (
            <button
              key={mot}
              type="button"
              onClick={() => handleAcceptSuggestion(mot)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-400 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-300"
              title={`Cliquer pour accepter « ${mot} »`}
            >
              <CheckCircle size={12} />
              {mot}
            </button>
          ))}

          <input
            type="text"
            placeholder="Ajouter..."
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
            className="w-full rounded-md border border-(--color-border) bg-(--color-bg-card) px-2 py-0.5 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}

// ── Carte de post (layout 75/25) ────────────────────────────────

function DocumentCard({
  doc,
  lot,
  index,
  themes,
  oeuvres,
  onUpdate,
  onKeywordsAccepted,
  onMergeUp,
  saving,
}: {
  doc: LotDocument
  lot: LotDetail
  index: number
  themes: Array<{ id: number; nom: string; parent_id?: number | null }>
  oeuvres: Array<{ id: number; nom: string }>
  onUpdate: (data: Record<string, unknown>) => void
  onKeywordsAccepted: (keywordIds: number[]) => void
  onMergeUp: () => void
  saving: boolean
}) {
  const initialText = doc.contenu_revise || doc.contenu_brut || ''
  const [editText, setEditText] = useState(initialText)
  const textChanged = editText !== initialText

  const handleEditorChange = useCallback((md: string) => {
    setEditText(md)
  }, [])

  function handleSaveText() {
    onUpdate({ document_id: doc.id, contenu_revise: editText })
  }

  function handleDateChange(value: string) {
    onUpdate({ document_id: doc.id, date_publication: value || null })
  }

  return (
    <div
      className={`rounded-lg border-2 transition-colors ${
        !doc.selected
          ? 'border-gray-300 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-900'
          : 'border-(--color-border) bg-(--color-bg-card)'
      } p-4`}
    >
      {/* Layout 2 colonnes : éditeur 75% | métadonnées 25% */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* ── Colonne gauche : éditeur ── */}
        <div className="min-w-0 lg:w-3/4">
          {/* En-tête de la carte */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdate({ document_id: doc.id, selected: !doc.selected })}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                doc.selected
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300'
                  : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300'
              }`}
              aria-label={doc.selected ? 'Exclure ce message' : 'Inclure ce message'}
            >
              {doc.selected ? <Eye size={14} /> : <EyeSlash size={14} />}
              {doc.selected ? 'Inclus' : 'Exclu'}
            </button>

            <span className="text-sm font-medium text-(--color-text)">
              {doc.source_item_id ? `#${doc.source_item_id}` : `Doc ${doc.id}`}
            </span>

            <input
              type="date"
              value={toDateInput(doc.date_publication)}
              onChange={(e) => handleDateChange(e.target.value)}
              className="rounded-md border border-(--color-border) bg-(--color-bg-card) px-2 py-1 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-none"
            />

            {index > 0 && (
              <button
                type="button"
                onClick={onMergeUp}
                className="flex items-center gap-1 rounded-md border border-(--color-border) px-2 py-1 text-xs font-medium text-(--color-text) transition-colors hover:bg-(--color-bg-hover)"
                title="Fusionner avec le message précédent"
              >
                <ArrowLineUp size={12} />
                Fusionner
              </button>
            )}
          </div>

          {/* Éditeur riche Milkdown */}
          <MarkdownEditor value={initialText} onChange={handleEditorChange} />

          {/* Barre de sauvegarde */}
          <div className="mt-2 flex items-center gap-3">
            {textChanged && (
              <button
                type="button"
                onClick={handleSaveText}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                <FloppyDisk size={14} />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            )}
            <span className="text-xs text-(--color-text-muted)">
              {editText.length} car.
              {textChanged && ' — non enregistré'}
            </span>
          </div>
        </div>

        {/* ── Colonne droite : métadonnées (sticky) ── */}
        <div className="lg:w-1/4 lg:sticky lg:top-20 lg:self-start">
          <MetadataPanel
            doc={doc}
            lot={lot}
            themes={themes}
            oeuvres={oeuvres}
            onUpdate={onUpdate}
            onKeywordsAccepted={onKeywordsAccepted}
          />
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ─────────────────────────────────────────

export function DetailLot({ lot, onKeywordsAccepted }: Props) {
  const updateStatus = useUpdateLotStatus()
  const checkConformity = useCheckConformity()
  const integrateLot = useIntegrateLot()
  const updateDocument = useUpdateLotDocument()
  const deleteDocument = useDeleteLotDocument()
  const [conformity, setConformity] = useState<ConformityResult | null>(null)
  const [lotOeuvreId, setLotOeuvreId] = useState<number | null>(null)
  const { data: themes } = useThemes()
  const { data: oeuvres } = useOeuvres()

  const nextStates = LOT_VALID_TRANSITIONS[lot.status]
  const includedCount = lot.documents.filter((d) => d.selected).length

  async function handleCheckConformity() {
    const result = await checkConformity.mutateAsync(lot.id)
    setConformity(result)
  }

  function handleUpdate(data: Record<string, unknown>) {
    updateDocument.mutate({ lotId: lot.id, data })
  }

  function handleLotOeuvreChange(oeuvreId: number | null) {
    setLotOeuvreId(oeuvreId)
    for (const doc of lot.documents) {
      updateDocument.mutate({
        lotId: lot.id,
        data: { document_id: doc.id, oeuvre_id: oeuvreId },
      })
    }
  }

  async function handleMergeUp(currentDoc: LotDocument, prevDoc: LotDocument) {
    const currentText = currentDoc.contenu_revise || currentDoc.contenu_brut || ''
    const prevText = prevDoc.contenu_revise || prevDoc.contenu_brut || ''
    const merged = prevText + '\n\n' + currentText

    await updateDocument.mutateAsync({
      lotId: lot.id,
      data: { document_id: prevDoc.id, contenu_revise: merged },
    })

    const prevKwIds = prevDoc.keywords.map((k) => k.keyword_id)
    const currentKwIds = currentDoc.keywords.map((k) => k.keyword_id)
    const unionIds = [...new Set([...prevKwIds, ...currentKwIds])]
    if (unionIds.length > prevKwIds.length) {
      await apiClient.setLotDocumentKeywords(lot.id, unionIds, 'manual')
    }

    deleteDocument.mutate({ lotId: lot.id, docId: currentDoc.id })
  }

  return (
    <div className="space-y-6">
      {/* ── En-tête du lot ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-(--color-text)">{lot.nom}</h2>
          {lot.description && (
            <p className="mt-1 text-sm text-(--color-text-muted)">{lot.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-(--color-text-muted)">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${LOT_STATUS_COLORS[lot.status]}`}
            >
              {LOT_STATUS_LABELS[lot.status]}
            </span>
            <span>{lot.source_type}</span>
            <span>
              {includedCount}/{lot.documents.length} inclus
            </span>
            {formatDateFr(lot.created_at) && <span>{formatDateFr(lot.created_at)}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sélecteur d'œuvre du lot */}
          <select
            value={lotOeuvreId ?? ''}
            onChange={(e) =>
              handleLotOeuvreChange(e.target.value ? Number(e.target.value) : null)
            }
            className="rounded-md border border-(--color-border) bg-(--color-bg-card) px-2 py-2 text-sm text-(--color-text)"
          >
            <option value="">Œuvre du lot</option>
            {(oeuvres as Array<{ id: number; nom: string }> | undefined)?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nom}
              </option>
            ))}
          </select>

          {lot.status === 'pret' && (
            <>
              <button
                type="button"
                onClick={handleCheckConformity}
                disabled={checkConformity.isPending}
                className="flex items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-(--color-bg-hover)"
              >
                <WarningCircle size={16} />
                {checkConformity.isPending ? 'Vérification...' : 'Vérifier conformité'}
              </button>
              <button
                type="button"
                onClick={() => integrateLot.mutate(lot.id)}
                disabled={integrateLot.isPending || (conformity !== null && !conformity.conforme)}
                className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle size={16} weight="fill" />
                {integrateLot.isPending ? 'Intégration...' : 'Intégrer au corpus'}
              </button>
            </>
          )}

          {nextStates.length > 0 && lot.status !== 'pret' && (
            <div className="flex gap-1">
              {nextStates.map((next: LotStatus) => (
                <button
                  key={next}
                  type="button"
                  onClick={() => updateStatus.mutate({ id: lot.id, status: next })}
                  disabled={updateStatus.isPending}
                  className="flex items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-(--color-bg-hover)"
                >
                  <ArrowRight size={14} />
                  {LOT_STATUS_LABELS[next]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Alertes ── */}
      {lot.error_message && <BlocErreur title="Erreur du lot" message={lot.error_message} />}

      {conformity && !conformity.conforme && (
        <BlocErreur
          type="warning"
          title="Lot non conforme"
          message={`${conformity.documents_ok}/${conformity.documents_total} documents conformes.`}
          details={conformity.missing}
        />
      )}
      {conformity && conformity.conforme && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          <CheckCircle size={18} weight="fill" />
          Lot conforme — prêt pour l'intégration.
        </div>
      )}

      {integrateLot.isSuccess && integrateLot.data?.data && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          <CheckCircle size={18} weight="fill" />
          {integrateLot.data.data.integrated} citations intégrées
          {integrateLot.data.data.duplicates > 0 &&
            `, ${integrateLot.data.data.duplicates} doublons ignorés`}
          .
        </div>
      )}
      {integrateLot.isError && (
        <BlocErreur
          title="Échec de l'intégration"
          message={
            integrateLot.error instanceof Error ? integrateLot.error.message : 'Erreur inconnue'
          }
        />
      )}

      {/* ── Liste des cartes de posts ── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-(--color-text-muted)">
          Messages ({lot.documents.length})
        </h3>
        {lot.documents.length === 0 && (
          <p className="py-4 text-center text-sm text-(--color-text-muted)">
            Aucun document dans ce lot.
          </p>
        )}
        {lot.documents.map((doc, i) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            lot={lot}
            index={i}
            themes={(themes as Array<{ id: number; nom: string; parent_id?: number | null }>) ?? []}
            oeuvres={(oeuvres as Array<{ id: number; nom: string }>) ?? []}
            onUpdate={handleUpdate}
            onKeywordsAccepted={(kwIds) => onKeywordsAccepted(doc.id, kwIds)}
            onMergeUp={() => handleMergeUp(doc, lot.documents[i - 1]!)}
            saving={updateDocument.isPending}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Verify lint**

Run: `pnpm lint`
Expected: No errors (run `pnpm prettier --write src/features/atelier/components/DetailLot.tsx` if formatting issues).

- [ ] **Step 6: Commit**

```bash
git add src/features/atelier/components/DetailLot.tsx
git commit -m "feat(atelier): rewrite DetailLot — Milkdown editor, 75/25 layout, merge, date, lot oeuvre"
```

---

### Task 3: Deploy and verify

**Files:**
- Deploy: `api/dal/lots.php`, `api/endpoints/lots.php` to server
- Deploy: `pnpm build` output via rsync

- [ ] **Step 1: Deploy PHP changes**

```bash
rsync -avz api/dal/lots.php api/endpoints/lots.php lumosphere:/home2/mist2786/public_html/api/dal/ lumosphere:/home2/mist2786/public_html/api/endpoints/
```

Note: rsync with two remotes doesn't work — use two separate commands:

```bash
rsync -avz api/dal/lots.php lumosphere:/home2/mist2786/public_html/api/dal/
rsync -avz api/endpoints/lots.php lumosphere:/home2/mist2786/public_html/api/endpoints/
```

- [ ] **Step 2: Build and deploy frontend**

```bash
pnpm build
rsync -avz dist/ lumosphere:/home2/mist2786/public_html/ --exclude='/api/' --exclude='/config/' --exclude='/lots/' --exclude='/workers/' --exclude='/cron/'
```

- [ ] **Step 3: Verify in browser**

Open the atelier, click on a lot, and verify:

1. Each post shows the Milkdown rich editor (not a textarea)
2. The metadata panel (theme, oeuvre, keywords) is on the right, sticky
3. The date field is editable and saves correctly
4. The "Fusionner" button merges text and keywords into the previous post
5. The lot-level oeuvre selector propagates to all posts
6. On mobile width, the layout stacks vertically
