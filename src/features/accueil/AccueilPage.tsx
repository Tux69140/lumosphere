// src/features/accueil/AccueilPage.tsx
import { useEffect, useRef } from 'react'
import { CitationCard } from '@/components/CitationCard'
import { CitationCardSkeleton } from '@/components/CitationCardSkeleton'
import { ResultsInfoBar } from '@/components/ResultsInfoBar'
import { useAuth } from '@/hooks/useAuth'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'

const ADMIN_ROLES = [1, 2] // Administrateur, Éditeur

export function AccueilPage() {
  const { user } = useAuth()
  const canEdit = user ? ADMIN_ROLES.includes(user.role_id) : false
  const { items, loading, error, hasMore, loadingMore, loadMore, reset, hasActiveFilters } =
    useCorpusSearch()
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Charge le paquet suivant dès que la sentinelle de bas de liste approche du viewport.
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

  return (
    // Cartes en quasi-pleine largeur, juste un peu plus étroites que le bord (petites
    // marges symétriques) ; le souffle latéral du texte est géré dans la carte.
    <div className="mx-auto w-full max-w-[90rem]">
      {/* Titre de page réservé aux lecteurs d'écran (pas d'encombrement visuel). */}
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
              />
            ))}
          </div>
        </>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="mt-4">
          {loadingMore && <CitationCardSkeleton />}
        </div>
      )}
    </div>
  )
}
