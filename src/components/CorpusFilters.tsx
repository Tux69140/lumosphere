import { useEffect, useRef, type InputHTMLAttributes } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'
import { getThemeCheckState } from '@/features/corpus/themeSelection'
import type { CheckState } from '@/features/corpus/types'

type TriProps = { state: CheckState } & Omit<InputHTMLAttributes<HTMLInputElement>, 'checked'>

function TriCheckbox({ state, ...props }: TriProps) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'indeterminate'
  }, [state])
  return <input ref={ref} type="checkbox" checked={state === 'checked'} {...props} />
}

const sectionTitle = 'mb-1 text-xs font-semibold uppercase text-(--color-text-secondary)'
const rowLabel = 'flex items-center gap-2 py-0.5 text-sm text-(--color-text-primary)'

export function CorpusFilters() {
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
    reset,
    hasActiveFilters,
  } = useCorpusSearch()

  return (
    <>
      <div className="mb-4">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-placeholder)"
          />
          <input
            type="text"
            aria-label="Rechercher dans le contenu"
            placeholder="Rechercher dans le contenu…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) py-2 pl-9 pr-9 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
          />
          {query && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full text-(--color-text-placeholder) hover:text-(--color-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {query.trim() && (
        <div className="mb-3">
          <h3 className={sectionTitle}>Trier par</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSort('date')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                sort === 'date'
                  ? 'bg-(--color-action) text-(--color-action-text)'
                  : 'bg-(--color-bg-sidebar) text-(--color-text-secondary) hover:bg-(--color-bg-button)'
              }`}
            >
              Date
            </button>
            <button
              type="button"
              onClick={() => setSort('score')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                sort === 'score'
                  ? 'bg-(--color-action) text-(--color-action-text)'
                  : 'bg-(--color-bg-sidebar) text-(--color-text-secondary) hover:bg-(--color-bg-button)'
              }`}
            >
              Pertinence
            </button>
          </div>
        </div>
      )}

      <div className="mb-3">
        <h3 className={sectionTitle}>
          Œuvres{selectedOeuvreIds.length ? ` (${selectedOeuvreIds.length})` : ''}
        </h3>
        {oeuvres.length === 0 ? (
          <p className="text-xs text-(--color-text-placeholder)">Aucune œuvre</p>
        ) : (
          <div className="max-h-48 overflow-y-auto pr-1">
            {oeuvres.map((o) => (
              <label key={o.id} className={rowLabel}>
                <input
                  type="checkbox"
                  aria-label={o.nom}
                  checked={selectedOeuvreIds.includes(o.id)}
                  onChange={() => toggleOeuvre(o.id)}
                />
                <span>{o.nom}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3">
        <h3 className={sectionTitle}>
          Thèmes{selectedThemeIds.length ? ` (${selectedThemeIds.length})` : ''}
        </h3>
        {themeTree.length === 0 ? (
          <p className="text-xs text-(--color-text-placeholder)">Aucun thème</p>
        ) : (
          <div className="max-h-48 overflow-y-auto pr-1">
            {themeTree.map((parent) => (
              <div key={parent.id}>
                <label className={rowLabel}>
                  <TriCheckbox
                    state={getThemeCheckState(selectedThemeIds, themeTree, parent.id)}
                    aria-label={parent.nom}
                    onChange={() => toggleTheme(parent.id)}
                  />
                  <span>{parent.nom}</span>
                </label>
                {parent.children.map((child) => (
                  <label key={child.id} className={`${rowLabel} pl-5`}>
                    <input
                      type="checkbox"
                      aria-label={child.nom}
                      checked={
                        getThemeCheckState(selectedThemeIds, themeTree, child.id) === 'checked'
                      }
                      onChange={() => toggleTheme(child.id)}
                    />
                    <span>{child.nom}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3">
        <h3 className={sectionTitle}>
          Mots-clés{keywordIds.length ? ` (${keywordIds.length})` : ''}
        </h3>
        {keywords.length === 0 ? (
          <p className="text-xs text-(--color-text-placeholder)">Aucun mot-clé</p>
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
      </div>

      <div className="mb-3">
        <h3 className={sectionTitle}>Période</h3>
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-(--color-text-secondary)">Du</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-(--color-border) bg-(--color-bg-field) px-2 py-1 text-sm text-(--color-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-(--color-text-secondary)">Au</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-(--color-border) bg-(--color-bg-field) px-2 py-1 text-sm text-(--color-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
            />
          </label>
        </div>
      </div>

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
