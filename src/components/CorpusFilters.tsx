// src/components/CorpusFilters.tsx
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
    selectedOeuvreIds,
    selectedThemeIds,
    toggleOeuvre,
    toggleTheme,
    reset,
    hasActiveFilters,
  } = useCorpusSearch()

  return (
    <>
      <div className="mb-4">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-placeholder)"
          />
          <input
            type="text"
            aria-label="Rechercher dans le contenu"
            placeholder="Rechercher dans le contenu…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) py-2 pl-9 pr-9 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder)"
          />
          {query && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-(--color-text-placeholder) hover:text-(--color-text-primary)"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

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
        <h3 className={sectionTitle}>Mots-clés</h3>
        <p className="text-xs text-(--color-text-placeholder)">À venir</p>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={reset}
          className="mt-1 text-sm text-(--color-accent) hover:underline"
        >
          Réinitialiser
        </button>
      )}
    </>
  )
}
