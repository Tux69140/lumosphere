import { useState, useRef, useEffect } from 'react'
import {
  Smiley,
  Image as ImageIcon,
  Note,
  ArrowCounterClockwise,
  TextB,
  TextItalic,
  ListBullets,
  Quotes,
  Link,
  DotsThreeOutline,
  CaretDown,
} from '@phosphor-icons/react'

const EMOJIS = ['😀', '😊', '🙏', '❤️', '✨', '🔥', '✅', '⚠️', '📖', '🕊️']

const BLOCK_LABELS: Record<string, string> = {
  paragraph: 'Paragraphe',
  h1: 'Titre 1',
  h2: 'Titre 2',
  h3: 'Titre 3',
}

export type MarkdownToolbarProps = {
  onInsert: (text: string) => void
  onReset: () => void
  onSetHeading?: (level: 0 | 1 | 2 | 3) => void
  currentBlockType?: string
  onToggleStrong?: () => void
  onToggleEmphasis?: () => void
  onToggleBulletList?: () => void
  onToggleBlockquote?: () => void
}

export function MarkdownToolbar({
  onInsert,
  onReset,
  onSetHeading,
  currentBlockType,
  onToggleStrong,
  onToggleEmphasis,
  onToggleBulletList,
  onToggleBlockquote,
}: MarkdownToolbarProps) {
  const [blockOpen, setBlockOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const blockRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  // Fermeture des menus au clic/toucher extérieur.
  useEffect(() => {
    if (!blockOpen && !moreOpen) return
    function onOutside(e: MouseEvent) {
      if (blockRef.current && !blockRef.current.contains(e.target as Node)) setBlockOpen(false)
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
        setEmojiOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [blockOpen, moreOpen])

  function setBlock(level: 0 | 1 | 2 | 3) {
    onSetHeading?.(level)
    setBlockOpen(false)
  }

  function insertImage() {
    setMoreOpen(false)
    const path = window.prompt("Chemin de l'image (ex. images/exemple.png)")
    if (!path) return
    const alt = window.prompt('Texte alternatif') ?? ''
    const caption = window.prompt('Légende (optionnelle)') ?? ''
    const md = caption ? `![${alt}](${path})\n\n*${caption}*\n\n` : `![${alt}](${path})\n\n`
    onInsert(md)
  }

  function insertFootnote() {
    setMoreOpen(false)
    onInsert('texte[^note]\n\n[^note]: Contenu de la note.\n')
  }

  // Lien au curseur : pas besoin de sélectionner du texte au préalable.
  // On demande le libellé puis l'adresse, et on insère du Markdown que
  // le moteur parse en nœud « lien » (aucune syntaxe brute visible ensuite).
  function insertLink() {
    const text = window.prompt('Texte du lien') ?? ''
    const href = window.prompt('Adresse du lien (ex. https://…)')
    if (!href) return
    onInsert(`[${text || href}](${href})`)
  }

  // Cibles tactiles 36 px. PAS de onMouseDown/preventDefault : celui-ci
  // supprimait le clic synthétisé sur Android Chrome (B/I muets).
  // Le parent appelle focusEditor() après chaque commande pour conserver
  // le clavier mobile ouvert.
  const btnCls =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-(--color-bg-button) active:bg-(--color-bg-button)'
  const sep = <div className="mx-0.5 h-5 w-px shrink-0 bg-(--color-border)" aria-hidden="true" />
  const currentLabel = BLOCK_LABELS[currentBlockType ?? 'paragraph'] ?? 'Paragraphe'

  // flex-wrap = filet anti-débordement : si la largeur manque, les boutons
  // passent à la ligne plutôt que de déborder ou d'être rognés.
  // PAS d'overflow-hidden (il coupait les menus déroulants en absolu).
  return (
    <div className="flex w-full flex-wrap items-center gap-1">
      {/* Style de bloc (Paragraphe / Titres) — menu déroulant custom, agit au curseur */}
      {onSetHeading && (
        <div ref={blockRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setBlockOpen((o) => !o)}
            aria-expanded={blockOpen}
            aria-haspopup="listbox"
            className="flex h-9 items-center gap-1 rounded-md border border-(--color-border) bg-(--color-bg-field) px-2 text-sm text-(--color-text-primary) hover:bg-(--color-bg-button)"
          >
            <span className="max-w-[80px] truncate">{currentLabel}</span>
            <CaretDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
          </button>

          {blockOpen && (
            <div
              role="listbox"
              className="absolute left-0 top-full z-20 mt-1 min-w-[130px] rounded-lg border border-(--color-border) bg-(--color-bg-card) py-1 shadow-lg"
            >
              {(
                [
                  ['paragraph', 'Paragraphe', 0],
                  ['h1', 'Titre 1', 1],
                  ['h2', 'Titre 2', 2],
                  ['h3', 'Titre 3', 3],
                ] as const
              ).map(([key, label, level]) => (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={currentBlockType === key}
                  onClick={() => setBlock(level)}
                  className={`flex w-full items-center px-3 py-2.5 text-sm hover:bg-(--color-bg-button) ${
                    currentBlockType === key
                      ? 'font-semibold text-(--color-accent-ink)'
                      : 'text-(--color-text-primary)'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {sep}

      {/* Marques et blocs — agissent au curseur, jamais besoin de sélectionner */}
      {onToggleStrong && (
        <button
          type="button"
          onClick={onToggleStrong}
          className={btnCls}
          aria-label="Gras"
          title="Gras"
        >
          <TextB className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      {onToggleEmphasis && (
        <button
          type="button"
          onClick={onToggleEmphasis}
          className={btnCls}
          aria-label="Italique"
          title="Italique"
        >
          <TextItalic className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      {onToggleBulletList && (
        <button
          type="button"
          onClick={onToggleBulletList}
          className={btnCls}
          aria-label="Liste à puces"
          title="Liste à puces"
        >
          <ListBullets className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      {onToggleBlockquote && (
        <button
          type="button"
          onClick={onToggleBlockquote}
          className={btnCls}
          aria-label="Citation"
          title="Citation"
        >
          <Quotes className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <button type="button" onClick={insertLink} className={btnCls} aria-label="Lien" title="Lien">
        <Link className="h-4 w-4" aria-hidden="true" />
      </button>

      {sep}

      {/* Menu « … » : insertions secondaires + réinitialisation */}
      <div ref={moreRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          className={btnCls}
          aria-label="Plus d'options"
          title="Plus d'options"
          aria-expanded={moreOpen}
        >
          <DotsThreeOutline className="h-4 w-4" aria-hidden="true" />
        </button>

        {moreOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[190px] rounded-lg border border-(--color-border) bg-(--color-bg-card) py-1 shadow-lg">
            {/* Emoji */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setEmojiOpen((o) => !o)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-(--color-text-primary) hover:bg-(--color-bg-button)"
              >
                <Smiley className="h-4 w-4 shrink-0" aria-hidden="true" />
                Emoji
              </button>
              {emojiOpen && (
                <div className="absolute right-full top-0 z-30 mr-1 flex w-[180px] flex-wrap gap-1 rounded-lg border border-(--color-border) bg-(--color-bg-card) p-2 shadow-md">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className="h-9 w-9 rounded text-xl hover:bg-(--color-bg-button)"
                      onClick={() => {
                        onInsert(e)
                        setEmojiOpen(false)
                        setMoreOpen(false)
                      }}
                      aria-label={`Emoji ${e}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Image */}
            <button
              type="button"
              onClick={insertImage}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-(--color-text-primary) hover:bg-(--color-bg-button)"
            >
              <ImageIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              Image
            </button>

            {/* Note de bas de page */}
            <button
              type="button"
              onClick={insertFootnote}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-(--color-text-primary) hover:bg-(--color-bg-button)"
            >
              <Note className="h-4 w-4 shrink-0" aria-hidden="true" />
              Note de bas de page
            </button>

            <div className="my-1 border-t border-(--color-border)" />

            {/* Réinitialiser */}
            <button
              type="button"
              onClick={() => {
                onReset()
                setMoreOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-(--color-bg-button) dark:text-red-400"
            >
              <ArrowCounterClockwise className="h-4 w-4 shrink-0" aria-hidden="true" />
              Réinitialiser
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
