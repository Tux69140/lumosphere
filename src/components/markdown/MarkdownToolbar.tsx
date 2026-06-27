import { useState } from 'react'
import { Smiley, Image as ImageIcon, Note, ArrowCounterClockwise } from '@phosphor-icons/react'

// Palette d'emojis volontairement courte et orientée corpus spirituel.
const EMOJIS = ['😀', '😊', '🙏', '❤️', '✨', '🔥', '✅', '⚠️', '📖', '🕊️']

export type MarkdownToolbarProps = {
  /** Insère du Markdown au curseur. */
  onInsert: (text: string) => void
  /** Vide l'éditeur. */
  onReset: () => void
}

/**
 * Barre d'outils COMPLÉMENTAIRE, agnostique du moteur : couvre ce que les
 * moteurs ne fournissent pas couramment de façon homogène (emoji, image par
 * référence, note de bas de page, reset). Le formatage courant
 * (gras/titres/listes/tableaux…) est fourni par chaque moteur.
 */
export function MarkdownToolbar({ onInsert, onReset }: MarkdownToolbarProps) {
  const [emojiOpen, setEmojiOpen] = useState(false)

  function insertImage() {
    const path = window.prompt('Chemin de l’image (ex. images/exemple.png)')
    if (!path) return
    const alt = window.prompt('Texte alternatif') ?? ''
    const caption = window.prompt('Légende (optionnelle)') ?? ''
    const md = caption ? `![${alt}](${path})\n\n*${caption}*\n\n` : `![${alt}](${path})\n\n`
    onInsert(md)
  }

  function insertFootnote() {
    onInsert('texte[^note]\n\n[^note]: Contenu de la note.\n')
  }

  return (
    <div className="flex flex-nowrap items-center gap-1 overflow-x-auto border-b border-(--color-border) p-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setEmojiOpen((o) => !o)}
          className="rounded p-1 hover:bg-(--color-bg-button)"
          aria-label="Insérer un emoji"
        >
          <Smiley className="h-5 w-5" aria-hidden="true" />
        </button>
        {emojiOpen && (
          <div className="absolute z-10 mt-1 flex flex-wrap gap-1 rounded border border-(--color-border) bg-(--color-bg-card) p-2 shadow-md">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className="rounded p-1 text-lg hover:bg-(--color-bg-button)"
                onClick={() => {
                  onInsert(e)
                  setEmojiOpen(false)
                }}
                aria-label={`Emoji ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={insertImage}
        className="rounded p-1 hover:bg-(--color-bg-button)"
        aria-label="Insérer une image par référence"
      >
        <ImageIcon className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={insertFootnote}
        className="rounded p-1 hover:bg-(--color-bg-button)"
        aria-label="Insérer une note de bas de page"
      >
        <Note className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="rounded p-1 hover:bg-(--color-bg-button)"
        aria-label="Réinitialiser l’éditeur"
      >
        <ArrowCounterClockwise className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  )
}
