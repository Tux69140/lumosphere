import { useEffect, useRef, useState } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { CitationCard } from '@/components/CitationCard'
import { CitationCardSkeleton } from '@/components/CitationCardSkeleton'
import { ResultsInfoBar } from '@/components/ResultsInfoBar'
import { CitationEditor } from '@/features/corpus/CitationEditor'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'

const ADMIN_ROLES = [1, 2]
const VIRTUALIZE_THRESHOLD = 200

export function AccueilPage() {
  const { user } = useAuth()
  const canEdit = user ? ADMIN_ROLES.includes(user.role_id) : false
  const {
    items: rawItems,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMore,
    refresh,
    reset,
    hasActiveFilters,
    favoritesOnly,
  } = useCorpusSearch()
  const { favoriteIds, toggle: toggleFavorite } = useFavorites()
  const isClientFiltered = favoritesOnly && !user
  const items = isClientFiltered ? rawItems.filter((c) => favoriteIds.has(c.id)) : rawItems
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadMore, items.length])

  // Pattern officiel scrollMargin de useWindowVirtualizer : lecture de
  // listRef.current pendant le rendu, hors périmètre du React Compiler.
  /* eslint-disable react-hooks/refs */
  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => 200,
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  })
  /* eslint-enable react-hooks/refs */

  const useVirtual = items.length > VIRTUALIZE_THRESHOLD

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <h1 className="sr-only">Index interactif - publications</h1>
      <ResultsInfoBar />

      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-2 rounded-md bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-text)"
        >
          <span>
            Impossible de charger les citations. Vérifiez votre connexion, puis réessayez.
          </span>
          <button
            type="button"
            onClick={refresh}
            className="self-start rounded-md bg-(--color-action) px-3 py-1.5 text-sm font-medium text-(--color-action-text) transition-colors hover:bg-(--color-action-hover)"
          >
            Réessayer
          </button>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="mt-4 flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CitationCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {!error && items.length === 0 && (
            <div className="mt-4 rounded-lg border border-(--color-border) bg-(--color-bg-card) p-8 text-center">
              <p className="text-sm text-(--color-text-secondary)">
                {hasActiveFilters
                  ? 'Aucune citation ne correspond à ces filtres.'
                  : 'La bibliothèque est encore vide.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={reset}
                  className="mt-3 rounded-md px-3 py-2 text-sm font-medium text-(--color-action) hover:bg-(--color-bg-button) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          )}

          {useVirtual ? (
            <div
              ref={listRef}
              className="mt-4"
              style={{ position: 'relative', height: virtualizer.getTotalSize(), width: '100%' }}
            >
              {virtualizer.getVirtualItems().map((vRow) => {
                const c = items[vRow.index]!
                return (
                  <div
                    key={vRow.key}
                    data-index={vRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${vRow.start - virtualizer.options.scrollMargin}px)`,
                      paddingBottom: '1rem',
                    }}
                  >
                    <CitationCard
                      contenu={c.contenu}
                      oeuvre_nom={c.oeuvre_nom}
                      theme_nom={c.theme_nom}
                      auteur_nom={c.auteur_nom}
                      notes={c.notes}
                      mots_cles={(c.mots_cles ?? []).map((k) => k.mot)}
                      canEdit={canEdit}
                      onEdit={() => setEditingId(c.id)}
                      isFavorited={favoriteIds.has(c.id)}
                      onToggleFavorite={() => toggleFavorite(c.id)}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {items.map((c) => (
                <CitationCard
                  key={c.id}
                  contenu={c.contenu}
                  oeuvre_nom={c.oeuvre_nom}
                  theme_nom={c.theme_nom}
                  auteur_nom={c.auteur_nom}
                  notes={c.notes}
                  mots_cles={(c.mots_cles ?? []).map((k) => k.mot)}
                  canEdit={canEdit}
                  onEdit={() => setEditingId(c.id)}
                  isFavorited={favoriteIds.has(c.id)}
                  onToggleFavorite={() => toggleFavorite(c.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {hasMore && !isClientFiltered && (
        <div ref={sentinelRef} className="mt-4">
          {loadingMore && <CitationCardSkeleton />}
        </div>
      )}

      {!loading && !hasMore && items.length > 0 && (
        <p className="mt-6 text-center text-sm text-(--color-text-secondary)">Fin des résultats.</p>
      )}

      {editingId !== null && (
        <CitationEditor
          citationId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
