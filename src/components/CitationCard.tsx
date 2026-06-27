// src/components/CitationCard.tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Heart, PencilSimple } from '@phosphor-icons/react'

// Auteur « maison » : ses citations n'affichent pas de signature d'auteur.
const HOUSE_AUTHOR = 'Lulumineuse'
const MARKDOWN_PLUGINS = [remarkGfm]

type CitationCardProps = {
  contenu: string
  oeuvre_nom: string | null
  theme_nom: string | null
  auteur_nom: string | null
  notes: string | null
  mots_cles: string[]
  canEdit?: boolean
}

export function CitationCard({
  contenu,
  oeuvre_nom,
  theme_nom,
  auteur_nom,
  notes,
  mots_cles,
  canEdit = false,
}: CitationCardProps) {
  const showAuteur = auteur_nom != null && auteur_nom.trim() !== '' && auteur_nom !== HOUSE_AUTHOR
  const showNotes = notes != null && notes.trim() !== ''

  return (
    <article className="group rounded-lg border border-(--color-border) bg-(--color-bg-card) px-7 py-5 shadow-sm transition-shadow hover:shadow-md">
      {/* En-tête : thème (gauche) + œuvre (droite) */}
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex-1 text-xs text-(--color-text-secondary)">
          <span className="font-medium text-(--color-text-primary)">Thème :&nbsp;</span>
          {theme_nom ?? 'Non spécifié'}
        </div>
        {oeuvre_nom && (
          <span className="shrink-0 text-sm font-medium text-(--color-accent-ink)">
            {oeuvre_nom}
          </span>
        )}
      </div>

      {/* Contenu (Markdown) */}
      <div className="prose-display flow-root text-sm text-(--color-text-primary)">
        <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{contenu}</ReactMarkdown>
      </div>

      {/* Auteur (uniquement si ≠ Lulumineuse) */}
      {showAuteur && (
        <p className="mt-2 text-xs font-medium text-(--color-text-secondary)">— {auteur_nom}</p>
      )}

      {/* Notes de publication (uniquement si non vides) */}
      {showNotes && (
        <div
          data-testid="publication-notes"
          className="prose-display mt-4 border-t border-(--color-border) pt-3 text-xs text-(--color-text-secondary)"
        >
          <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{notes}</ReactMarkdown>
        </div>
      )}

      {/* Pied : mots-clés (gauche) + actions inertes (droite) */}
      <div className="mt-3 flex min-h-[30px] items-center justify-between gap-2 border-t border-(--color-border) pt-3">
        <div className="flex flex-1 flex-wrap gap-2">
          {mots_cles.map((mc) => (
            <span
              key={mc}
              className="rounded-full bg-(--color-bg-sidebar) px-2 py-1 text-xs text-(--color-text-secondary)"
            >
              {mc}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled
            title="Favori (bientôt disponible)"
            aria-label="Ajouter aux favoris"
            className="rounded-full p-1.5 text-(--color-text-placeholder) disabled:cursor-not-allowed"
          >
            <Heart className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          {canEdit && (
            <button
              type="button"
              disabled
              title="Éditer (bientôt disponible)"
              aria-label="Éditer cette entrée"
              className="rounded-full p-1.5 text-(--color-text-placeholder) disabled:cursor-not-allowed"
            >
              <PencilSimple className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
