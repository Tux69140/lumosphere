// src/components/CitationCard.tsx
type CitationCardProps = {
  contenu: string
  auteur_nom: string | null
  theme_nom: string | null
  mots_cles: string[]
}

export function CitationCard({ contenu, auteur_nom, theme_nom, mots_cles }: CitationCardProps) {
  return (
    <article className="rounded-lg border border-(--color-border) bg-(--color-bg-card) p-4">
      {theme_nom && (
        <p className="mb-2 text-xs text-(--color-text-secondary)">Thème : {theme_nom}</p>
      )}
      <p className="mb-3 text-sm leading-relaxed text-(--color-text-primary) whitespace-pre-line">
        {contenu}
      </p>
      {auteur_nom && (
        <p className="mb-2 text-xs font-medium text-(--color-text-secondary)">— {auteur_nom}</p>
      )}
      {mots_cles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mots_cles.map((mc) => (
            <span
              key={mc}
              className="rounded-full bg-(--color-tag-bg) px-2.5 py-0.5 text-xs text-(--color-tag-text)"
            >
              {mc}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
