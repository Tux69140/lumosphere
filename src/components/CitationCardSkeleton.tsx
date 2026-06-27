// src/components/CitationCardSkeleton.tsx
// Squelette de chargement d'une carte de citation. Reprend la structure visuelle
// de CitationCard pour éviter le saut de mise en page au remplacement.
export function CitationCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-lg border border-(--color-border) bg-(--color-bg-card) px-7 py-5 shadow-sm"
    >
      <div className="motion-safe:animate-pulse">
        {/* En-tête : thème + œuvre */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="h-3 w-28 rounded bg-(--color-bg-sidebar)" />
          <div className="h-3 w-32 rounded bg-(--color-bg-sidebar)" />
        </div>
        {/* Contenu */}
        <div className="space-y-2.5">
          <div className="h-3 w-full rounded bg-(--color-bg-sidebar)" />
          <div className="h-3 w-11/12 rounded bg-(--color-bg-sidebar)" />
          <div className="h-3 w-4/5 rounded bg-(--color-bg-sidebar)" />
        </div>
        {/* Mots-clés */}
        <div className="mt-5 flex gap-2">
          <div className="h-5 w-16 rounded-full bg-(--color-bg-sidebar)" />
          <div className="h-5 w-20 rounded-full bg-(--color-bg-sidebar)" />
        </div>
      </div>
    </div>
  )
}
