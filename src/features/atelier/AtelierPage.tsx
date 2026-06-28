import { useState, useMemo } from 'react'
import { Factory, MagnifyingGlass } from '@phosphor-icons/react'
import { useLotsList, useLotCounts } from './useLots'
import { ListeLots } from './components/ListeLots'
import { LOT_STATUS_LABELS, LOT_STATUS_COLORS } from './types'
import type { LotStatus } from './types'

const ALL_STATUSES: LotStatus[] = [
  'en_attente',
  'en_cours',
  'en_traitement',
  'en_revision',
  'a_reprendre',
  'pret',
  'integre',
  'erreur',
]

export function AtelierPage() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sourceFilter, setSourceFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    if (statusFilter) p.status = statusFilter
    if (sourceFilter) p.source_type = sourceFilter
    return p
  }, [statusFilter, sourceFilter])

  const filtersKey = JSON.stringify(params)
  const { data, isLoading } = useLotsList(filtersKey, params)
  const { data: counts } = useLotCounts()

  const lots = useMemo(() => {
    const items = data?.items ?? []
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(
      (l) => l.nom.toLowerCase().includes(q) || (l.description ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Factory size={28} weight="fill" className="text-(--color-accent)" />
        <h1 className="text-2xl font-bold text-(--color-text)">Atelier</h1>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar filtres */}
        <aside className="w-full shrink-0 space-y-4 lg:w-56">
          {/* Compteurs par statut */}
          <div className="rounded-lg border border-(--color-border) bg-(--color-bg-card) p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
              Par statut
            </h3>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setStatusFilter('')}
                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm transition-colors ${
                  !statusFilter
                    ? 'bg-(--color-bg-hover) font-medium text-(--color-text)'
                    : 'text-(--color-text-muted) hover:bg-(--color-bg-hover)'
                }`}
              >
                <span>Tous</span>
                <span className="text-xs">{counts?.total ?? '—'}</span>
              </button>
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm transition-colors ${
                    statusFilter === s
                      ? 'bg-(--color-bg-hover) font-medium text-(--color-text)'
                      : 'text-(--color-text-muted) hover:bg-(--color-bg-hover)'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${LOT_STATUS_COLORS[s].split(' ')[0]}`}
                    />
                    {LOT_STATUS_LABELS[s]}
                  </span>
                  <span className="text-xs">{counts?.[s] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtre source */}
          <div className="rounded-lg border border-(--color-border) bg-(--color-bg-card) p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
              Source
            </h3>
            <div className="space-y-1">
              {['', 'telegram', 'pdf', 'youtube', 'html'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSourceFilter(s)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm transition-colors ${
                    sourceFilter === s
                      ? 'bg-(--color-bg-hover) font-medium text-(--color-text)'
                      : 'text-(--color-text-muted) hover:bg-(--color-bg-hover)'
                  }`}
                >
                  {s || 'Toutes'}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="min-w-0 flex-1">
          {/* Barre de recherche */}
          <div className="mb-4">
            <div className="relative">
              <MagnifyingGlass
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
              />
              <input
                type="text"
                placeholder="Rechercher un lot..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-(--color-border) bg-(--color-bg-card) py-2.5 pl-10 pr-4 text-sm text-(--color-text) placeholder:text-(--color-text-muted) focus:border-(--color-accent) focus:outline-none focus:ring-1 focus:ring-(--color-accent)"
              />
            </div>
          </div>

          <div className="rounded-lg border border-(--color-border) bg-(--color-bg-card)">
            <ListeLots lots={lots} loading={isLoading} />
          </div>
        </main>
      </div>
    </div>
  )
}
