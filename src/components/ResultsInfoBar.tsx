import { X } from '@phosphor-icons/react'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'
import type { ThemeNode } from '@/features/corpus/types'

function findThemeName(tree: ThemeNode[], id: number): string | undefined {
  for (const node of tree) {
    if (node.id === id) return node.nom
    for (const child of node.children) {
      if (child.id === id) return child.nom
    }
  }
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center rounded-full bg-(--color-tag-bg) py-1 pl-2.5 pr-1 text-xs font-medium text-(--color-tag-text)">
      {label}
      <button
        onClick={onRemove}
        className="ml-1.5 rounded-full p-0.5 hover:bg-(--color-bg-button) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
        aria-label={`Supprimer le filtre ${label}`}
      >
        <X size={12} aria-hidden="true" />
      </button>
    </span>
  )
}

export function ResultsInfoBar() {
  const {
    items,
    loading,
    total,
    hasActiveFilters,
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
    toggleOeuvre,
    toggleTheme,
    toggleKeyword,
    setDateFrom,
    setDateTo,
  } = useCorpusSearch()

  const displayCount = total ?? items.length
  const countLabel =
    loading && total === null
      ? 'Recherche…'
      : `${displayCount.toLocaleString('fr-FR')} résultat${displayCount !== 1 ? 's' : ''}`

  return (
    <div className="mb-4 space-y-2">
      <div className="flex min-h-[58px] items-center justify-between rounded-lg border border-(--color-border) bg-(--color-bg-card) p-3">
        <div className="flex-1" />
        <span
          role="status"
          aria-live="polite"
          className="rounded-full bg-(--color-bg-sidebar) px-3 py-1 text-sm font-medium text-(--color-text-secondary)"
        >
          {countLabel}
        </span>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {query.trim() !== '' && (
            <FilterPill label={`Recherche : « ${query} »`} onRemove={() => setQuery('')} />
          )}
          {selectedOeuvreIds.map((id) => {
            const nom = oeuvres.find((o) => o.id === id)?.nom ?? String(id)
            return (
              <FilterPill
                key={`oeuvre-${id}`}
                label={`Œuvre : ${nom}`}
                onRemove={() => toggleOeuvre(id)}
              />
            )
          })}
          {selectedThemeIds.map((id) => {
            const nom = findThemeName(themeTree, id) ?? String(id)
            return (
              <FilterPill
                key={`theme-${id}`}
                label={`Thème : ${nom}`}
                onRemove={() => toggleTheme(id)}
              />
            )
          })}
          {keywordIds.map((id) => {
            const mot = keywords.find((k) => k.id === id)?.mot ?? String(id)
            const modeLabel = keywordIds.length > 1 && keywordMode ? ` (${keywordMode})` : ''
            return (
              <FilterPill
                key={`kw-${id}`}
                label={`Mot-clé : ${mot}${modeLabel}`}
                onRemove={() => toggleKeyword(id)}
              />
            )
          })}
          {dateFrom && <FilterPill label={`Du : ${dateFrom}`} onRemove={() => setDateFrom('')} />}
          {dateTo && <FilterPill label={`Au : ${dateTo}`} onRemove={() => setDateTo('')} />}
        </div>
      )}
    </div>
  )
}
