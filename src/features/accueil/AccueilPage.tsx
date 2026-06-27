import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
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
    items,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMore,
    refresh,
    reset,
    hasActiveFilters,
  } = useCorpusSearch()
  const { favoriteIds, toggle: toggleFavorite } = useFavorites()
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)
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

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  })

  const useVirtual = items.length > VIRTUALIZE_THRESHOLD

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <h1 className="sr-only">Bibliothèque — citations</h1>
      <ResultsInfoBar />

      {error && (
        <div className="mb-4 rounded-md bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-text)">
          {error}
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
            <div ref={parentRef} className="mt-4 overflow-auto" style={{ height: '80vh' }}>
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  width: '100%',
                  position: 'relative',
                }}
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
                        transform: `translateY(${vRow.start}px)`,
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

      {hasMore && (
        <div ref={sentinelRef} className="mt-4">
          {loadingMore && <CitationCardSkeleton />}
        </div>
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
