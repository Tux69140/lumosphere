import { useState, useCallback, useEffect, useReducer } from 'react'
import {
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
import type { LotDetail, LotDocument, DocumentKeyword, ConformityResult } from '../types'
import { LOT_STATUS_LABELS, LOT_STATUS_COLORS } from '../types'
import {
  useUpdateLotStatus,
  useCheckConformity,
  useIntegrateLot,
  useUpdateLotDocument,
  useDeleteLotDocument,
  useSetDocumentKeywords,
} from '../useLots'
import { useThemes, useOeuvres } from '@/services/referenceQueries'
import { apiClient } from '@/services/api'
import { BlocErreur } from './BlocErreur'
import { MarkdownEditor } from '@/components/MarkdownEditor'

type Props = {
  lot: LotDetail
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

// ── Brouillon local du lot (rien n'est persisté avant clic « Enregistrer ») ──

type DocDraft = Partial<{
  contenu_revise: string
  theme_id: number | null
  oeuvre_id: number | null
  date_publication: string | null
  selected: boolean
  keywords: DocumentKeyword[] // panier « manuel » effectif
}>

type DraftState = Record<number, DocDraft>

type DraftAction =
  | { type: 'setField'; docId: number; field: keyof DocDraft; value: unknown }
  | { type: 'setKeywords'; docId: number; keywords: DocumentKeyword[] }
  | { type: 'setOeuvreAll'; docIds: number[]; oeuvreId: number | null }
  | { type: 'clearDoc'; docId: number }
  | { type: 'prune'; keepIds: Set<number> }
  | { type: 'clear' }

function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'setField':
      return { ...state, [action.docId]: { ...state[action.docId], [action.field]: action.value } }
    case 'setKeywords':
      return { ...state, [action.docId]: { ...state[action.docId], keywords: action.keywords } }
    case 'setOeuvreAll': {
      const next = { ...state }
      for (const docId of action.docIds) {
        next[docId] = { ...next[docId], oeuvre_id: action.oeuvreId }
      }
      return next
    }
    case 'clearDoc': {
      if (!(action.docId in state)) return state
      const next = { ...state }
      delete next[action.docId]
      return next
    }
    case 'prune': {
      let changed = false
      const next: DraftState = {}
      for (const key of Object.keys(state)) {
        const docId = Number(key)
        const entry = state[docId]
        if (!entry) continue
        if (action.keepIds.has(docId)) next[docId] = entry
        else changed = true
      }
      return changed ? next : state
    }
    case 'clear':
      return {}
  }
}

function baseText(doc: LotDocument): string {
  return doc.contenu_revise || doc.contenu_brut || ''
}

function manualKeywordsOf(doc: LotDocument): DocumentKeyword[] {
  return doc.keywords.filter((k) => k.source === 'manual')
}

function sameKeywordSets(a: DocumentKeyword[], b: DocumentKeyword[]): boolean {
  const idsA = a.map((k) => k.keyword_id).sort((x, y) => x - y)
  const idsB = b.map((k) => k.keyword_id).sort((x, y) => x - y)
  return idsA.length === idsB.length && idsA.every((v, i) => v === idsB[i])
}

// Champs scalaires réellement modifiés (diff draft ↔ serveur), ou `null` si rien.
function buildScalarPayload(doc: LotDocument, d: DocDraft): Record<string, unknown> | null {
  const payload: Record<string, unknown> = {}
  let changed = false
  if (d.contenu_revise !== undefined && d.contenu_revise !== baseText(doc)) {
    payload.contenu_revise = d.contenu_revise
    changed = true
  }
  if (d.theme_id !== undefined && d.theme_id !== doc.theme_id) {
    payload.theme_id = d.theme_id
    changed = true
  }
  if (d.oeuvre_id !== undefined && d.oeuvre_id !== doc.oeuvre_id) {
    payload.oeuvre_id = d.oeuvre_id
    changed = true
  }
  if (
    d.date_publication !== undefined &&
    toDateInput(d.date_publication) !== toDateInput(doc.date_publication)
  ) {
    payload.date_publication = d.date_publication
    changed = true
  }
  if (d.selected !== undefined && d.selected !== doc.selected) {
    payload.selected = d.selected
    changed = true
  }
  return changed ? payload : null
}

function keywordsDirty(doc: LotDocument, d: DocDraft | undefined): boolean {
  if (!d || d.keywords === undefined) return false
  return !sameKeywordSets(d.keywords, manualKeywordsOf(doc))
}

function isDocDirty(doc: LotDocument, d: DocDraft | undefined): boolean {
  if (!d) return false
  return buildScalarPayload(doc, d) !== null || keywordsDirty(doc, d)
}

// ── Panneau métadonnées (colonne droite sticky) ─────────────────

function MetadataPanel({
  doc,
  text,
  effTheme,
  effOeuvre,
  manualKeywords,
  themes,
  oeuvres,
  onFieldChange,
  onAcceptKeywords,
  onRemoveKeyword,
  onPersistThemeSuggestion,
}: {
  doc: LotDocument
  text: string
  effTheme: number | null
  effOeuvre: number | null
  manualKeywords: DocumentKeyword[]
  themes: Array<{ id: number; nom: string; parent_id?: number | null }>
  oeuvres: Array<{ id: number; nom: string }>
  onFieldChange: (field: 'theme_id' | 'oeuvre_id', value: number | null) => void
  onAcceptKeywords: (entries: DocumentKeyword[]) => void
  onRemoveKeyword: (kwId: number) => void
  onPersistThemeSuggestion: (themeSuggestedId: number) => void
}) {
  const [aiKwLoading, setAiKwLoading] = useState(false)
  const [aiThemeLoading, setAiThemeLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState('')

  async function handleAiSuggestKeywords() {
    if (!text.trim()) return
    setAiKwLoading(true)
    try {
      const res = await apiClient.aiSuggestKeywords(doc.id, text)
      if (res.status === 'ok' && res.data?.keywords) {
        const existing = new Set(manualKeywords.map((k) => k.mot.toLowerCase()))
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
        // La suggestion elle-même reste une écriture immédiate ; seule son
        // application au thème validé passe par le brouillon (badge ci-dessous).
        onPersistThemeSuggestion(res.data.theme_id)
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
      onAcceptKeywords([{ keyword_id: res.data.id, mot, source: 'manual' }])
      setAiSuggestions((prev) => prev.filter((s) => s !== mot))
    }
  }

  async function handleAddKeyword() {
    if (!newKeyword.trim()) return
    const mot = newKeyword.trim()
    const res = await apiClient.findOrCreateKeyword(mot)
    if (res.status === 'ok' && res.data) {
      onAcceptKeywords([{ keyword_id: res.data.id, mot, source: 'manual' }])
      setNewKeyword('')
    }
  }

  // Mots-clés suggérés par l'IA à l'import, en attente de validation humaine,
  // masqués dès qu'ils ont été acceptés dans le panier manuel du brouillon.
  const suggestedKeywords = doc.keywords.filter(
    (k) =>
      k.source === 'ai_suggested' && !manualKeywords.some((m) => m.keyword_id === k.keyword_id),
  )

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
          value={effTheme ?? ''}
          onChange={(e) =>
            onFieldChange('theme_id', e.target.value ? Number(e.target.value) : null)
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

        {/* Suggestion IA de thème (import) : proposée tant qu'aucun thème validé. */}
        {!effTheme && doc.theme_suggested_id && (
          <button
            type="button"
            onClick={() => onFieldChange('theme_id', doc.theme_suggested_id)}
            className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-dashed border-amber-400 bg-amber-50 px-2 py-1 text-xs text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-300"
            title="Accepter le thème suggéré par l'IA"
          >
            <Sparkle size={12} weight="fill" />
            Suggéré : {doc.theme_suggested_nom}
            <CheckCircle size={12} weight="fill" />
          </button>
        )}
      </div>

      {/* Œuvre */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-(--color-text-muted)">Œuvre</label>
        <select
          value={effOeuvre ?? ''}
          onChange={(e) =>
            onFieldChange('oeuvre_id', e.target.value ? Number(e.target.value) : null)
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
          {manualKeywords.map((kw) => (
            <span
              key={kw.keyword_id}
              className="inline-flex items-center gap-1 rounded-full bg-(--color-tag-bg) px-2 py-0.5 text-xs text-(--color-tag-text)"
            >
              <Tag size={10} />
              {kw.mot}
              <button
                type="button"
                onClick={() => onRemoveKeyword(kw.keyword_id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-red-200 dark:hover:bg-red-800"
                aria-label={`Retirer ${kw.mot}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}

          {/* Mots-clés suggérés par l'IA à l'import : toucher le badge = accepter. */}
          {suggestedKeywords.map((kw) => (
            <button
              key={`sug-${kw.keyword_id}`}
              type="button"
              onClick={() => onAcceptKeywords([{ ...kw, source: 'manual' }])}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-400 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
              title={`Accepter « ${kw.mot} »`}
              aria-label={`Accepter le mot-clé ${kw.mot}`}
            >
              <Sparkle size={10} weight="fill" />
              {kw.mot}
            </button>
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
  effSelected,
  effDate,
  effTheme,
  effOeuvre,
  manualKeywords,
  dirty,
  onFieldChange,
  onTextChange,
  onAcceptKeywords,
  onRemoveKeyword,
  onPersistThemeSuggestion,
  onMergeUp,
}: {
  doc: LotDocument
  lot: LotDetail
  index: number
  themes: Array<{ id: number; nom: string; parent_id?: number | null }>
  oeuvres: Array<{ id: number; nom: string }>
  effSelected: boolean
  effDate: string | null
  effTheme: number | null
  effOeuvre: number | null
  manualKeywords: DocumentKeyword[]
  dirty: boolean
  onFieldChange: (
    field: 'theme_id' | 'oeuvre_id' | 'date_publication' | 'selected',
    value: unknown,
  ) => void
  onTextChange: (md: string) => void
  onAcceptKeywords: (entries: DocumentKeyword[]) => void
  onRemoveKeyword: (kwId: number) => void
  onPersistThemeSuggestion: (themeSuggestedId: number) => void
  onMergeUp: (currentEditText: string) => void
}) {
  const initialText = baseText(doc)
  const [editText, setEditText] = useState(initialText)

  const handleEditorChange = useCallback(
    (md: string) => {
      setEditText(md)
      onTextChange(md)
    },
    [onTextChange],
  )

  return (
    <div
      className={`rounded-lg border-2 transition-colors ${
        !effSelected
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
              onClick={() => onFieldChange('selected', !effSelected)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                effSelected
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300'
                  : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300'
              }`}
              aria-label={effSelected ? 'Exclure ce message' : 'Inclure ce message'}
            >
              {effSelected ? <Eye size={14} /> : <EyeSlash size={14} />}
              {effSelected ? 'Inclus' : 'Exclu'}
            </button>

            <span className="text-sm font-medium text-(--color-text)" title={doc.titre}>
              {doc.source_item_id
                ? `#${doc.source_item_id}`
                : doc.titre
                  ? doc.titre.slice(0, 50)
                  : `Message ${index + 1}`}
            </span>

            <input
              type="date"
              value={toDateInput(effDate || doc.created_at || lot.date_source_debut)}
              onChange={(e) => onFieldChange('date_publication', e.target.value || null)}
              className="rounded-md border border-(--color-border) bg-(--color-bg-card) px-2 py-1 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-none"
            />

            {index > 0 && (
              <button
                type="button"
                onClick={() => onMergeUp(editText)}
                className="flex items-center gap-1 rounded-md border border-(--color-border) px-2 py-1 text-xs font-medium text-(--color-text) transition-colors hover:bg-(--color-bg-hover)"
                title="Fusionner avec le message précédent"
              >
                <ArrowLineUp size={12} />
                Fusionner
              </button>
            )}

            {dirty && (
              <span
                className="ml-auto h-2 w-2 rounded-full bg-amber-500"
                title="Modifications non enregistrées"
              />
            )}
          </div>

          {/* Éditeur riche Milkdown */}
          <MarkdownEditor value={initialText} onChange={handleEditorChange} />

          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs text-(--color-text-muted)">
              {editText.length} car.
              {dirty && ' — non enregistré'}
            </span>
          </div>
        </div>

        {/* ── Colonne droite : métadonnées (sticky) ── */}
        <div className="lg:w-1/4 lg:sticky lg:top-20 lg:self-start">
          <MetadataPanel
            doc={doc}
            text={editText}
            effTheme={effTheme}
            effOeuvre={effOeuvre}
            manualKeywords={manualKeywords}
            themes={themes}
            oeuvres={oeuvres}
            onFieldChange={onFieldChange}
            onAcceptKeywords={onAcceptKeywords}
            onRemoveKeyword={onRemoveKeyword}
            onPersistThemeSuggestion={onPersistThemeSuggestion}
          />
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ─────────────────────────────────────────

export function DetailLot({ lot }: Props) {
  const updateStatus = useUpdateLotStatus()
  const checkConformity = useCheckConformity()
  const integrateLot = useIntegrateLot()
  const updateDocument = useUpdateLotDocument()
  const deleteDocument = useDeleteLotDocument()
  const setKeywords = useSetDocumentKeywords()
  const [conformity, setConformity] = useState<ConformityResult | null>(null)
  const firstDocOeuvre = lot.documents.find((d) => d.oeuvre_id !== null)?.oeuvre_id ?? null
  const [lotOeuvreId, setLotOeuvreId] = useState<number | null>(firstDocOeuvre)
  const { data: themes } = useThemes()
  const { data: oeuvres } = useOeuvres()

  const [draft, dispatch] = useReducer(draftReducer, {} as DraftState)
  const [resetKeys, setResetKeys] = useState<Record<number, number>>({})
  const [isSavingAll, setIsSavingAll] = useState(false)
  const [saveAllError, setSaveAllError] = useState<string | null>(null)

  // Purge le brouillon des documents disparus (ex : fusionnés).
  useEffect(() => {
    dispatch({ type: 'prune', keepIds: new Set(lot.documents.map((d) => d.id)) })
  }, [lot.documents])

  const includedCount = lot.documents.filter((d) => d.selected).length
  const isWorking = lot.status === 'en_traitement'
  const dirtyCount = lot.documents.filter((doc) => isDocDirty(doc, draft[doc.id])).length

  // Auto-transition : dès qu'un lot en attente est ouvert, il passe en traitement.
  useEffect(() => {
    if (lot.status === 'en_attente') {
      updateStatus.mutate({ id: lot.id, status: 'en_traitement' })
    }
    // On ne re-déclenche pas si lot.status change (une seule fois à l'ouverture).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lot.id])

  async function handleCheckConformity() {
    const result = await checkConformity.mutateAsync(lot.id)
    setConformity(result)
  }

  // Vérifie la conformité puis intègre seulement si tout est conforme ;
  // sinon le bloc d'alerte affiche les champs manquants par message.
  async function handleIntegrate() {
    const result = await checkConformity.mutateAsync(lot.id)
    setConformity(result)
    if (result.conforme) {
      integrateLot.mutate(lot.id)
    }
  }

  function handleLotOeuvreChange(oeuvreId: number | null) {
    setLotOeuvreId(oeuvreId)
    dispatch({ type: 'setOeuvreAll', docIds: lot.documents.map((d) => d.id), oeuvreId })
  }

  function handleAcceptKeywords(docId: number, entries: DocumentKeyword[]) {
    const doc = lot.documents.find((d) => d.id === docId)
    if (!doc) return
    const current = draft[docId]?.keywords ?? manualKeywordsOf(doc)
    const byId = new Map(current.map((k) => [k.keyword_id, k]))
    for (const e of entries) byId.set(e.keyword_id, e)
    dispatch({ type: 'setKeywords', docId, keywords: [...byId.values()] })
  }

  function handleRemoveKeywordDraft(docId: number, kwId: number) {
    const doc = lot.documents.find((d) => d.id === docId)
    if (!doc) return
    const current = draft[docId]?.keywords ?? manualKeywordsOf(doc)
    dispatch({ type: 'setKeywords', docId, keywords: current.filter((k) => k.keyword_id !== kwId) })
  }

  function persistThemeSuggestion(docId: number, themeSuggestedId: number) {
    updateDocument.mutate({
      lotId: lot.id,
      data: { document_id: docId, theme_suggested_id: themeSuggestedId },
    })
  }

  async function handleMergeUp(
    currentDoc: LotDocument,
    prevDoc: LotDocument,
    currentEditText: string,
  ) {
    const prevDraft = draft[prevDoc.id]
    const prevText = prevDraft?.contenu_revise ?? baseText(prevDoc)
    const merged = prevText + '\n\n' + currentEditText

    await updateDocument.mutateAsync({
      lotId: lot.id,
      data: { document_id: prevDoc.id, contenu_revise: merged },
    })

    const prevManual = prevDraft?.keywords ?? manualKeywordsOf(prevDoc)
    const currentManual = draft[currentDoc.id]?.keywords ?? manualKeywordsOf(currentDoc)
    const byId = new Map(prevManual.map((k) => [k.keyword_id, k]))
    for (const k of currentManual) byId.set(k.keyword_id, k)
    const mergedKeywords = [...byId.values()]
    if (mergedKeywords.length > prevManual.length) {
      await setKeywords.mutateAsync({
        lotId: lot.id,
        docId: prevDoc.id,
        keywordIds: mergedKeywords.map((k) => k.keyword_id),
        source: 'manual',
      })
    }

    await deleteDocument.mutateAsync({ lotId: lot.id, docId: currentDoc.id })

    dispatch({ type: 'clearDoc', docId: prevDoc.id })
    dispatch({ type: 'clearDoc', docId: currentDoc.id })
    setResetKeys((prev) => ({ ...prev, [prevDoc.id]: (prev[prevDoc.id] ?? 0) + 1 }))
  }

  async function handleSaveAll() {
    setSaveAllError(null)
    setIsSavingAll(true)
    try {
      const dirtyDocs = lot.documents.filter((doc) => isDocDirty(doc, draft[doc.id]))
      await Promise.all(
        dirtyDocs.map(async (doc) => {
          const d = draft[doc.id]!
          const tasks: Promise<unknown>[] = []
          const payload = buildScalarPayload(doc, d)
          if (payload) {
            tasks.push(
              updateDocument.mutateAsync({
                lotId: lot.id,
                data: { document_id: doc.id, ...payload },
              }),
            )
          }
          if (keywordsDirty(doc, d)) {
            tasks.push(
              setKeywords.mutateAsync({
                lotId: lot.id,
                docId: doc.id,
                keywordIds: d.keywords!.map((k) => k.keyword_id),
                source: 'manual',
              }),
            )
          }
          await Promise.all(tasks)
        }),
      )
      dispatch({ type: 'clear' })
    } catch (err) {
      setSaveAllError(
        err instanceof Error ? err.message : 'Erreur inconnue lors de l’enregistrement.',
      )
    } finally {
      setIsSavingAll(false)
    }
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

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {/* Sélecteur d'œuvre du lot */}
          <select
            value={lotOeuvreId ?? ''}
            onChange={(e) => handleLotOeuvreChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-md border border-(--color-border) bg-(--color-bg-card) px-2 py-2 text-sm text-(--color-text) sm:w-auto"
          >
            <option value="">Œuvre du lot</option>
            {(oeuvres as Array<{ id: number; nom: string }> | undefined)?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nom}
              </option>
            ))}
          </select>

          {isWorking && (
            <>
              {dirtyCount > 0 && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {dirtyCount} modification{dirtyCount > 1 ? 's' : ''} non enregistrée
                  {dirtyCount > 1 ? 's' : ''}
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={dirtyCount === 0 || isSavingAll}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-(--color-border) px-3 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-(--color-bg-hover) disabled:opacity-50 sm:w-auto"
              >
                <FloppyDisk size={16} />
                {isSavingAll ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={handleCheckConformity}
                disabled={checkConformity.isPending}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-(--color-border) px-3 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-(--color-bg-hover) sm:w-auto"
              >
                <WarningCircle size={16} />
                {checkConformity.isPending ? 'Vérification...' : 'Vérifier conformité'}
              </button>
              <button
                type="button"
                onClick={handleIntegrate}
                disabled={
                  integrateLot.isPending ||
                  checkConformity.isPending ||
                  (conformity !== null && !conformity.conforme)
                }
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50 sm:w-auto"
              >
                <CheckCircle size={16} weight="fill" />
                {integrateLot.isPending ? 'Intégration...' : 'Intégrer au Corpus'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Alertes ── */}
      {lot.error_message && <BlocErreur title="Erreur du lot" message={lot.error_message} />}

      {saveAllError && <BlocErreur title="Échec de l'enregistrement" message={saveAllError} />}

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
        {lot.documents.map((doc, i) => {
          const d = draft[doc.id]
          const effTheme = d?.theme_id !== undefined ? d.theme_id : doc.theme_id
          const effOeuvre = d?.oeuvre_id !== undefined ? d.oeuvre_id : doc.oeuvre_id
          const effSelected = d?.selected !== undefined ? d.selected : doc.selected
          const effDate =
            d?.date_publication !== undefined ? d.date_publication : doc.date_publication
          const manualKeywords = d?.keywords ?? manualKeywordsOf(doc)

          return (
            <DocumentCard
              key={`${doc.id}-${resetKeys[doc.id] ?? 0}`}
              doc={doc}
              lot={lot}
              index={i}
              themes={
                (themes as Array<{ id: number; nom: string; parent_id?: number | null }>) ?? []
              }
              oeuvres={(oeuvres as Array<{ id: number; nom: string }>) ?? []}
              effSelected={effSelected}
              effDate={effDate}
              effTheme={effTheme}
              effOeuvre={effOeuvre}
              manualKeywords={manualKeywords}
              dirty={isDocDirty(doc, d)}
              onFieldChange={(field, value) =>
                dispatch({ type: 'setField', docId: doc.id, field, value })
              }
              onTextChange={(md) =>
                dispatch({ type: 'setField', docId: doc.id, field: 'contenu_revise', value: md })
              }
              onAcceptKeywords={(entries) => handleAcceptKeywords(doc.id, entries)}
              onRemoveKeyword={(kwId) => handleRemoveKeywordDraft(doc.id, kwId)}
              onPersistThemeSuggestion={(themeSuggestedId) =>
                persistThemeSuggestion(doc.id, themeSuggestedId)
              }
              onMergeUp={(currentEditText) =>
                handleMergeUp(doc, lot.documents[i - 1]!, currentEditText)
              }
            />
          )
        })}
      </div>
    </div>
  )
}
