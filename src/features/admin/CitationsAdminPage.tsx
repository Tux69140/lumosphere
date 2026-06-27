import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [citations, setCitations] = useState<AdminCitation[]>([])
  const [loading, setLoading] = useState(true)
  const [etats, setEtats] = useState<EtatOption[]>([])
  const [oeuvres, setOeuvres] = useState<OeuvreOption[]>([])
  const [rawQuery, setRawQuery] = useState('')
  const query = useDebouncedValue(rawQuery, 300)
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [editorCitationId, setEditorCitationId] = useState<number | null>(null)

  const [bulkEtatId, setBulkEtatId] = useState<number>(0)
  const [bulkOeuvreId, setBulkOeuvreId] = useState<number>(0)

  useEffect(() => {
    Promise.all([apiClient.findEtats(), apiClient.findOeuvres()]).then(([etRes, oRes]) => {
      if (etRes.status === 'ok' && etRes.data) setEtats(etRes.data as EtatOption[])
      if (oRes.status === 'ok' && oRes.data) setOeuvres(oRes.data as OeuvreOption[])
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (query.trim()) params['q'] = query.trim()
    const firstSort = sorting[0]
    if (sorting.length > 0 && firstSort) {
      params['sort_by'] = firstSort.id
      params['sort_dir'] = firstSort.desc ? 'desc' : 'asc'
    }
    apiClient
      .findCitations(params)
      .then((res) => {
        if (res.status === 'ok' && res.data) {
          setCitations(res.data.items as AdminCitation[])
        } else {
          toast.error(res.errors?.[0] ?? 'Impossible de charger les entrées.')
        }
      })
      .finally(() => setLoading(false))
  }, [query, sorting])

  const etatOptions = useMemo(() => etats.map((e) => ({ id: e.id, label: e.nom })), [etats])
  const oeuvreOptions = useMemo(
    () =>
      oeuvres.map((o) => ({ id: o.id, label: o.nom + (o.auteur_nom ? ` (${o.auteur_nom})` : '') })),
    [oeuvres],
  )

  async function handleInlineUpdate(citationId: number, fields: Record<string, unknown>) {
    const res = await apiClient.updateCitation(citationId, fields)
    if (res.status !== 'ok') {
      toast.error(res.errors?.[0] ?? 'Modification impossible.')
      return
    }
    setCitations((prev) =>
      prev.map((c) => {
        if (c.id !== citationId) return c
        const updated = { ...c }
        if ('etat_id' in fields) {
          updated.etat_id = fields.etat_id as number
          const etat = etats.find((e) => e.id === fields.etat_id)
          updated.etat_nom = etat?.nom ?? null
          updated.etat_couleur = etat?.couleur ?? null
        }
        if ('oeuvre_id' in fields) {
          updated.oeuvre_id = fields.oeuvre_id as number
          const oeuvre = oeuvres.find((o) => o.id === fields.oeuvre_id)
          updated.oeuvre_nom = oeuvre?.nom ?? null
          updated.auteur_nom = oeuvre?.auteur_nom ?? null
        }
        return updated
      }),
    )
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
            onConfirm={(id) => void handleInlineUpdate(info.row.original.id, { oeuvre_id: id })}
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
            onConfirm={(id) => void handleInlineUpdate(info.row.original.id, { etat_id: id })}
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

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return
    const first = window.confirm(
      `Supprimer ${selectedIds.length} entrée(s) sélectionnée(s) ? Cette action est irréversible.`,
    )
    if (!first) return
    const second = window.confirm(
      `Confirmer la suppression définitive de ${selectedIds.length} entrée(s) ?`,
    )
    if (!second) return

    const res = await apiClient.bulkDeleteCitations(selectedIds)
    if (res.status !== 'ok') {
      toast.error(res.errors?.[0] ?? 'Suppression impossible.')
      return
    }
    toast.success(`${res.data?.deleted ?? selectedIds.length} entrée(s) supprimée(s).`)
    setCitations((prev) => prev.filter((c) => !selectedIds.includes(c.id)))
    setRowSelection({})
  }

  async function handleBulkUpdateEtat() {
    if (!bulkEtatId || selectedIds.length === 0) return
    const res = await apiClient.bulkUpdateCitations(selectedIds, { etat_id: bulkEtatId })
    if (res.status !== 'ok') {
      toast.error(res.errors?.[0] ?? 'Modification impossible.')
      return
    }
    const etat = etats.find((e) => e.id === bulkEtatId)
    toast.success(`État mis à jour pour ${res.data?.updated ?? selectedIds.length} entrée(s).`)
    setCitations((prev) =>
      prev.map((c) =>
        selectedIds.includes(c.id)
          ? {
              ...c,
              etat_id: bulkEtatId,
              etat_nom: etat?.nom ?? null,
              etat_couleur: etat?.couleur ?? null,
            }
          : c,
      ),
    )
    setBulkEtatId(0)
    setRowSelection({})
  }

  async function handleBulkUpdateOeuvre() {
    if (!bulkOeuvreId || selectedIds.length === 0) return
    const res = await apiClient.bulkUpdateCitations(selectedIds, { oeuvre_id: bulkOeuvreId })
    if (res.status !== 'ok') {
      toast.error(res.errors?.[0] ?? 'Modification impossible.')
      return
    }
    const oeuvre = oeuvres.find((o) => o.id === bulkOeuvreId)
    toast.success(`Œuvre mise à jour pour ${res.data?.updated ?? selectedIds.length} entrée(s).`)
    setCitations((prev) =>
      prev.map((c) =>
        selectedIds.includes(c.id)
          ? {
              ...c,
              oeuvre_id: bulkOeuvreId,
              oeuvre_nom: oeuvre?.nom ?? null,
              auteur_nom: oeuvre?.auteur_nom ?? null,
            }
          : c,
      ),
    )
    setBulkOeuvreId(0)
    setRowSelection({})
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
              onClick={() => void handleBulkUpdateEtat()}
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
              onClick={() => void handleBulkUpdateOeuvre()}
              className="rounded-md bg-(--color-action) px-3 py-1 text-sm font-medium text-white hover:bg-(--color-action-hover) disabled:cursor-not-allowed disabled:opacity-40"
            >
              Appliquer
            </button>
          </div>

          <button
            onClick={() => void handleBulkDelete()}
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
            setLoading(true)
            const params: Record<string, string> = {}
            if (query.trim()) params['q'] = query.trim()
            apiClient.findCitations(params).then((res) => {
              if (res.status === 'ok' && res.data) setCitations(res.data.items as AdminCitation[])
              setLoading(false)
            })
          }}
        />
      )}
    </div>
  )
}
