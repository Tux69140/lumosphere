import { useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { PencilSimple, Trash, CaretUp, CaretDown, CaretUpDown } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'
import { unwrap, useOeuvres, useEtats } from '@/services/referenceQueries'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { CitationEditor } from '@/features/corpus/CitationEditor'

type AdminCitation = {
  id: number
  contenu: string
  oeuvre_nom: string | null
  oeuvre_id: number
  theme_nom: string | null
  auteur_nom: string | null
  etat_nom: string | null
  etat_id: number
  etat_couleur: string | null
  date_entree: string | null
}

type EtatOption = { id: number; nom: string; couleur: string | null }
type OeuvreOption = { id: number; nom: string; auteur_nom: string | null }

const col = createColumnHelper<AdminCitation>()

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + '…'
}

function InlineCellSelect({
  value,
  options,
  onConfirm,
}: {
  value: number
  options: { id: number; label: string }[]
  onConfirm: (newId: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(value)
  const ref = useRef<HTMLSelectElement>(null)

  if (!editing) {
    const found = options.find((o) => o.id === value)
    return (
      <button
        className="rounded px-1 text-left text-xs text-(--color-text-secondary) hover:bg-(--color-bg-button)"
        onClick={(e) => {
          e.stopPropagation()
          setEditing(true)
          setPending(value)
          setTimeout(() => ref.current?.focus(), 0)
        }}
      >
        {found?.label ?? '—'}
      </button>
    )
  }

  return (
    <select
      ref={ref}
      className="rounded border border-(--color-border) bg-(--color-bg-field) px-1 py-0.5 text-xs text-(--color-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
      value={pending}
      onChange={(e) => setPending(Number(e.target.value))}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => {
        setEditing(false)
        if (pending !== value) onConfirm(pending)
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          setEditing(false)
          if (pending !== value) onConfirm(pending)
        }
        if (e.key === 'Escape') {
          setEditing(false)
        }
      }}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function CitationsAdminPage() {
  const qc = useQueryClient()
  const [rawQuery, setRawQuery] = useState('')
  const query = useDebouncedValue(rawQuery, 300)
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [editorCitationId, setEditorCitationId] = useState<number | null>(null)
  const [bulkEtatId, setBulkEtatId] = useState<number>(0)
  const [bulkOeuvreId, setBulkOeuvreId] = useState<number>(0)

  // Référentiels via hooks partagés
  const { data: etatsRaw = [] } = useEtats()
  const { data: oeuvresRaw = [] } = useOeuvres()
  const etats = etatsRaw as unknown as EtatOption[]
  const oeuvres = oeuvresRaw as unknown as OeuvreOption[]

  // Paramètres de filtrage sérialisés pour la clé de cache
  const params = useMemo<Record<string, string>>(() => {
    const p: Record<string, string> = {}
    if (query.trim()) p['q'] = query.trim()
    const firstSort = sorting[0]
    if (firstSort) {
      p['sort_by'] = firstSort.id
      p['sort_dir'] = firstSort.desc ? 'desc' : 'asc'
    }
    return p
  }, [query, sorting])

  const filtersKey = useMemo(() => JSON.stringify(params), [params])

  // Liste des citations via useQuery
  const { data: citations = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.citationsAdmin(filtersKey),
    queryFn: async () => {
      const res = await apiClient.findCitations(params)
      if (res.status !== 'ok') throw new Error(res.errors?.[0] ?? 'Chargement impossible.')
      return (res.data?.items ?? []) as AdminCitation[]
    },
  })

  // Mutations — invalidation préfixe ['citations'] couvre search ET admin
  const inlineUpdateMutation = useMutation({
    mutationFn: ({ id, fields }: { id: number; fields: Record<string, unknown> }) =>
      unwrap(apiClient.updateCitation(id, fields)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['citations'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const bulkUpdateEtatMutation = useMutation({
    mutationFn: ({ ids, etatId }: { ids: number[]; etatId: number }) =>
      unwrap(apiClient.bulkUpdateCitations(ids, { etat_id: etatId })),
    onSuccess: (data, vars) => {
      toast.success(`État mis à jour pour ${data.updated ?? vars.ids.length} entrée(s).`)
      void qc.invalidateQueries({ queryKey: ['citations'] })
      setBulkEtatId(0)
      setRowSelection({})
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const bulkUpdateOeuvreMutation = useMutation({
    mutationFn: ({ ids, oeuvreId }: { ids: number[]; oeuvreId: number }) =>
      unwrap(apiClient.bulkUpdateCitations(ids, { oeuvre_id: oeuvreId })),
    onSuccess: (data, vars) => {
      toast.success(`Œuvre mise à jour pour ${data.updated ?? vars.ids.length} entrée(s).`)
      void qc.invalidateQueries({ queryKey: ['citations'] })
      setBulkOeuvreId(0)
      setRowSelection({})
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => unwrap(apiClient.bulkDeleteCitations(ids)),
    onSuccess: (data, ids) => {
      toast.success(`${data.deleted ?? ids.length} entrée(s) supprimée(s).`)
      void qc.invalidateQueries({ queryKey: ['citations'] })
      setRowSelection({})
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Suppression unitaire — mutation prête pour liaison future (pas de bouton UI pour l'instant)
  // La variable n'est pas stockée pour satisfaire noUnusedLocals ; l'appel crée le cache TQ
  /* deleteCitationMut — liaison Task 20 */
  useMutation({
    mutationFn: (id: number) => apiClient.deleteCitation(id),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Suppression impossible.')
        return
      }
      void qc.invalidateQueries({ queryKey: ['citations'] })
      toast.success('Entrée supprimée.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })

  const etatOptions = useMemo(() => etats.map((e) => ({ id: e.id, label: e.nom })), [etats])
  const oeuvreOptions = useMemo(
    () =>
      oeuvres.map((o) => ({ id: o.id, label: o.nom + (o.auteur_nom ? ` (${o.auteur_nom})` : '') })),
    [oeuvres],
  )

  function handleInlineUpdate(citationId: number, fields: Record<string, unknown>) {
    inlineUpdateMutation.mutate({ id: citationId, fields })
  }

  const columns = useMemo(
    () => [
      col.display({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="cursor-pointer accent-(--color-action)"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomePageRowsSelected()
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="Tout sélectionner"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="cursor-pointer accent-(--color-action)"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Sélectionner entrée ${row.original.id}`}
          />
        ),
        size: 40,
      }),
      col.accessor('contenu', {
        header: 'Contenu',
        cell: (info) => (
          <span className="text-xs text-(--color-text-primary)" title={info.getValue()}>
            {truncate(info.getValue(), 80)}
          </span>
        ),
        enableSorting: true,
      }),
      col.accessor('oeuvre_nom', {
        id: 'oeuvre_nom',
        header: 'Œuvre',
        cell: (info) => (
          <InlineCellSelect
            value={info.row.original.oeuvre_id}
            options={oeuvreOptions}
            onConfirm={(id) => handleInlineUpdate(info.row.original.id, { oeuvre_id: id })}
          />
        ),
        enableSorting: true,
      }),
      col.accessor('theme_nom', {
        header: 'Thème',
        cell: (info) => (
          <span className="text-xs text-(--color-text-secondary)">{info.getValue() ?? '—'}</span>
        ),
        enableSorting: true,
      }),
      col.accessor('auteur_nom', {
        header: 'Auteur',
        cell: (info) => (
          <span className="text-xs text-(--color-text-secondary)">{info.getValue() ?? '—'}</span>
        ),
        enableSorting: true,
      }),
      col.accessor('etat_nom', {
        id: 'etat_nom',
        header: 'État',
        cell: (info) => (
          <InlineCellSelect
            value={info.row.original.etat_id}
            options={etatOptions}
            onConfirm={(id) => handleInlineUpdate(info.row.original.id, { etat_id: id })}
          />
        ),
        enableSorting: true,
      }),
      col.accessor('date_entree', {
        header: 'Date',
        cell: (info) => (
          <span className="text-xs text-(--color-text-secondary)">{info.getValue() ?? '—'}</span>
        ),
        enableSorting: true,
      }),
      col.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <button
            className="rounded p-1 text-(--color-text-secondary) hover:bg-(--color-bg-button) hover:text-(--color-text-primary)"
            title="Éditer"
            aria-label={`Éditer entrée ${row.original.id}`}
            onClick={(e) => {
              e.stopPropagation()
              setEditorCitationId(row.original.id)
            }}
          >
            <PencilSimple size={15} aria-hidden="true" />
          </button>
        ),
        size: 48,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [oeuvreOptions, etatOptions],
  )

  const table = useReactTable({
    data: citations,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableRowSelection: true,
    getRowId: (row) => String(row.id),
  })

  const selectedIds = Object.keys(rowSelection)
    .filter((k) => rowSelection[k])
    .map(Number)

  function handleBulkDelete() {
    if (selectedIds.length === 0) return
    const first = window.confirm(
      `Supprimer ${selectedIds.length} entrée(s) sélectionnée(s) ? Cette action est irréversible.`,
    )
    if (!first) return
    const second = window.confirm(
      `Confirmer la suppression définitive de ${selectedIds.length} entrée(s) ?`,
    )
    if (!second) return
    bulkDeleteMutation.mutate(selectedIds)
  }

  function handleBulkUpdateEtat() {
    if (!bulkEtatId || selectedIds.length === 0) return
    bulkUpdateEtatMutation.mutate({ ids: selectedIds, etatId: bulkEtatId })
  }

  function handleBulkUpdateOeuvre() {
    if (!bulkOeuvreId || selectedIds.length === 0) return
    bulkUpdateOeuvreMutation.mutate({ ids: selectedIds, oeuvreId: bulkOeuvreId })
  }

  const selectClass =
    'rounded-md border border-(--color-border) bg-(--color-bg-field) px-2 py-1 text-sm text-(--color-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)'

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-(--color-text-primary)">Entrées</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">
        Gérez les citations du corpus. Cliquez sur une cellule Œuvre ou État pour l'éditer en ligne.
      </p>

      <div className="mb-3 flex items-center gap-3">
        <input
          type="search"
          placeholder="Rechercher…"
          className="w-64 rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-1.5 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          aria-label="Rechercher dans les entrées"
        />
        {selectedIds.length > 0 && (
          <span className="rounded-full bg-(--color-accent-bg) px-2 py-0.5 text-xs font-medium text-(--color-text-primary)">
            {selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div
          className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-(--color-border) bg-(--color-bg-card) px-4 py-2"
          data-testid="bulk-actions-bar"
        >
          <span className="text-sm font-medium text-(--color-text-primary)">
            Actions groupées :
          </span>

          <div className="flex items-center gap-2">
            <select
              className={selectClass}
              value={bulkEtatId}
              onChange={(e) => setBulkEtatId(Number(e.target.value))}
              aria-label="Choisir un état pour les entrées sélectionnées"
            >
              <option value={0}>— Changer l'état —</option>
              {etats.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom}
                </option>
              ))}
            </select>
            <button
              disabled={!bulkEtatId}
              onClick={() => handleBulkUpdateEtat()}
              className="rounded-md bg-(--color-action) px-3 py-1 text-sm font-medium text-white hover:bg-(--color-action-hover) disabled:cursor-not-allowed disabled:opacity-40"
            >
              Appliquer
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              className={selectClass}
              value={bulkOeuvreId}
              onChange={(e) => setBulkOeuvreId(Number(e.target.value))}
              aria-label="Choisir une œuvre pour les entrées sélectionnées"
            >
              <option value={0}>— Changer l'œuvre —</option>
              {oeuvres.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nom}
                  {o.auteur_nom ? ` (${o.auteur_nom})` : ''}
                </option>
              ))}
            </select>
            <button
              disabled={!bulkOeuvreId}
              onClick={() => handleBulkUpdateOeuvre()}
              className="rounded-md bg-(--color-action) px-3 py-1 text-sm font-medium text-white hover:bg-(--color-action-hover) disabled:cursor-not-allowed disabled:opacity-40"
            >
              Appliquer
            </button>
          </div>

          <button
            onClick={() => handleBulkDelete()}
            className="ml-auto flex items-center gap-1.5 text-sm text-(--color-danger-text) hover:underline"
            aria-label="Supprimer les entrées sélectionnées"
          >
            <Trash size={15} aria-hidden="true" />
            Supprimer ({selectedIds.length})
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-(--color-border)">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" aria-label="Tableau des entrées">
            <thead className="border-b border-(--color-border) bg-(--color-bg-card)">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-3 py-2 text-xs font-semibold text-(--color-text-secondary)"
                      style={h.column.getSize() !== 150 ? { width: h.column.getSize() } : undefined}
                    >
                      {h.isPlaceholder ? null : h.column.getCanSort() ? (
                        <button
                          className="flex items-center gap-1 hover:text-(--color-text-primary)"
                          onClick={h.column.getToggleSortingHandler()}
                          aria-label={`Trier par ${typeof h.column.columnDef.header === 'string' ? h.column.columnDef.header : ''}`}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {h.column.getIsSorted() === 'asc' ? (
                            <CaretUp size={12} aria-hidden="true" />
                          ) : h.column.getIsSorted() === 'desc' ? (
                            <CaretDown size={12} aria-hidden="true" />
                          ) : (
                            <CaretUpDown size={12} aria-hidden="true" className="opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-6 text-center text-sm text-(--color-text-secondary)"
                  >
                    Chargement…
                  </td>
                </tr>
              ) : citations.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-6 text-center text-sm text-(--color-text-placeholder)"
                  >
                    Aucune entrée trouvée.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-testid={`citation-row-${row.original.id}`}
                    className={`border-b border-(--color-border) transition-colors last:border-0 ${
                      row.getIsSelected()
                        ? 'bg-(--color-accent-bg)'
                        : 'hover:bg-(--color-bg-button)'
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editorCitationId !== null && (
        <CitationEditor
          citationId={editorCitationId}
          onClose={() => setEditorCitationId(null)}
          onSaved={() => {
            setEditorCitationId(null)
            void qc.invalidateQueries({ queryKey: ['citations'] })
          }}
        />
      )}
    </div>
  )
}
