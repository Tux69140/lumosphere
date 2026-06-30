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
  onToggleLink?: () => void
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
  onToggleLink,
}: MarkdownToolbarProps) {
  const [blockOpen, setBlockOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const blockRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  // Fermeture des menus au clic extérieur
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

  // onMouseDown preventDefault = empêche le blur de l'éditeur lors du clic sur un bouton,
  // ce qui préserve la sélection de texte avant d'appliquer le formatage.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault()

  const btnCls =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors hover:bg-(--color-bg-button) active:bg-(--color-bg-button)'
  const sep = <div className="mx-1 h-5 w-px shrink-0 bg-(--color-border)" aria-hidden="true" />
  const currentLabel = BLOCK_LABELS[currentBlockType ?? 'paragraph'] ?? 'Paragraphe'

  return (
    <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-0.5 overflow-hidden">
      {/* Menu déroulant type de bloc (remplace le <select> natif Android) */}
      {onSetHeading && (
        <div ref={blockRef} className="relative shrink-0">
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={() => setBlockOpen((o) => !o)}
            aria-expanded={blockOpen}
            aria-haspopup="listbox"
            className="flex h-8 items-center gap-1 rounded-md border border-(--color-border) bg-(--color-bg-field) px-2 text-sm text-(--color-text-primary) hover:bg-(--color-bg-button)"
          >
            <span className="max-w-[72px] truncate">{currentLabel}</span>
            <CaretDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
          </button>

          {blockOpen && (
            <div
              role="listbox"
              className="absolute left-0 top-full z-20 mt-1 min-w-[120px] rounded-lg border border-(--color-border) bg-(--color-bg-card) py-1 shadow-lg"
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
                  onMouseDown={keepFocus}
                  onClick={() => setBlock(level)}
                  className={`flex w-full items-center px-3 py-2 text-sm hover:bg-(--color-bg-button) ${
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

      {/* Marques de mise en forme — toujours visibles, keepFocus préserve la sélection */}
      {onToggleStrong && (
        <button
          type="button"
          onMouseDown={keepFocus}
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
          onMouseDown={keepFocus}
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
          onMouseDown={keepFocus}
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
          onMouseDown={keepFocus}
          onClick={onToggleBlockquote}
          className={btnCls}
          aria-label="Citation"
          title="Citation"
        >
          <Quotes className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      {onToggleLink && (
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={onToggleLink}
          className={btnCls}
          aria-label="Lien"
          title="Lien (sélectionner le texte d'abord)"
        >
          <Link className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {sep}

      {/* Menu « … » : insertions spéciales et réinitialisation */}
      <div ref={moreRef} className="relative shrink-0">
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={() => setMoreOpen((o) => !o)}
          className={btnCls}
          aria-label="Plus d'options"
          title="Plus d'options"
          aria-expanded={moreOpen}
        >
          <DotsThreeOutline className="h-4 w-4" aria-hidden="true" />
        </button>

        {moreOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[170px] rounded-lg border border-(--color-border) bg-(--color-bg-card) py-1 shadow-lg">
            {/* Emoji */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => setEmojiOpen((o) => !o)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-(--color-text-primary) hover:bg-(--color-bg-button)"
              >
                <Smiley className="h-4 w-4 shrink-0" aria-hidden="true" />
                Emoji
              </button>
              {emojiOpen && (
                <div className="absolute left-full top-0 z-30 ml-1 flex flex-wrap gap-1 rounded-lg border border-(--color-border) bg-(--color-bg-card) p-2 shadow-md">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onMouseDown={keepFocus}
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
              onMouseDown={keepFocus}
              onClick={insertImage}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-(--color-text-primary) hover:bg-(--color-bg-button)"
            >
              <ImageIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              Image
            </button>

            {/* Note de bas de page */}
            <button
              type="button"
              onMouseDown={keepFocus}
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
              onMouseDown={keepFocus}
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
