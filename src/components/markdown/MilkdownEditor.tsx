import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Crepe } from '@milkdown/crepe'
import { callCommand, insert, replaceAll } from '@milkdown/kit/utils'
import {
  wrapInHeadingCommand,
  turnIntoTextCommand,
  toggleStrongCommand,
  toggleEmphasisCommand,
  wrapInBulletListCommand,
  wrapInBlockquoteCommand,
  toggleLinkCommand,
} from '@milkdown/kit/preset/commonmark'
import { editorViewCtx } from '@milkdown/kit/core'
import { Code, Eye } from '@phosphor-icons/react'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/nord.css'
import type { MarkdownEditorHandle, MarkdownEditorProps } from './types'
import { MarkdownToolbar } from './MarkdownToolbar'

/**
 * Moteur Milkdown (Crepe / ProseMirror + remark). Markdown = donnée-maître.
 * ENCAPSULATION : tout import `@milkdown/*` reste confiné à ce fichier.
 * Crepe fournit nativement la barre flottante, le menu blocs, les tableaux
 * visuels, l'annuler/rétablir ; `MarkdownToolbar` complète (emoji/image/note).
 */
export const MilkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MilkdownEditor({ value, onChange, readOnly = false }, ref) {
    const rootRef = useRef<HTMLDivElement>(null)
    const crepeRef = useRef<Crepe | null>(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    const [mode, setMode] = useState<'wysiwyg' | 'source'>('wysiwyg')
    const [sourceText, setSourceText] = useState(value)
    const [blockType, setBlockType] = useState<string>('paragraph')

    /** Lit le type du bloc sous le curseur via ProseMirror. */
    const readBlockType = useCallback((): string => {
      if (!crepeRef.current) return 'paragraph'
      try {
        return crepeRef.current.editor.action((ctx) => {
          const view = ctx.get(editorViewCtx)
          const { $from } = view.state.selection
          const parent = $from.parent
          if (parent.type.name === 'heading') return `h${parent.attrs['level'] as number}`
          return parent.type.name
        })
      } catch {
        return 'paragraph'
      }
    }, [])

    const handleToggleStrong = useCallback(() => {
      crepeRef.current?.editor.action(callCommand(toggleStrongCommand.key))
    }, [])

    const handleToggleEmphasis = useCallback(() => {
      crepeRef.current?.editor.action(callCommand(toggleEmphasisCommand.key))
    }, [])

    const handleToggleBulletList = useCallback(() => {
      crepeRef.current?.editor.action(callCommand(wrapInBulletListCommand.key))
    }, [])

    const handleToggleBlockquote = useCallback(() => {
      crepeRef.current?.editor.action(callCommand(wrapInBlockquoteCommand.key))
    }, [])

    const handleToggleLink = useCallback(() => {
      const href = window.prompt('URL du lien (ex. https://…)')
      if (!href) return
      crepeRef.current?.editor.action(callCommand(toggleLinkCommand.key, { href }))
    }, [])

    // Montage unique : Crepe est non contrôlé (defaultValue figé au montage).
    useEffect(() => {
      if (!rootRef.current) return
      // image-block désactivé : restaure l'image Markdown standard `![alt](src)`
      // sans réécriture de l'alt (réserve n°1 du re-challenge T15).
      const crepe = new Crepe({
        root: rootRef.current,
        defaultValue: value,
        features: {
          [Crepe.Feature.ImageBlock]: false,
          [Crepe.Feature.BlockEdit]: false,
        },
      })
      crepeRef.current = crepe
      crepe.create().then(() => {
        crepe.setReadonly(readOnly)
        crepe.on((listener) => {
          listener.markdownUpdated((_ctx, markdown) => onChangeRef.current(markdown))
        })
        // Met à jour le type de bloc à chaque changement de sélection ou de contenu.
        crepe.on((listener) => {
          listener.selectionUpdated(() => setBlockType(readBlockType()))
          listener.updated(() => setBlockType(readBlockType()))
        })
      })
      return () => {
        crepe.destroy()
        crepeRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      crepeRef.current?.setReadonly(readOnly)
    }, [readOnly])

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => crepeRef.current?.editor.action(insert(text)),
      reset: () => crepeRef.current?.editor.action(replaceAll('')),
      getMarkdown: () => crepeRef.current?.getMarkdown() ?? '',
      setHeading: (level: 0 | 1 | 2 | 3) => {
        if (!crepeRef.current) return
        if (level === 0) {
          crepeRef.current.editor.action(callCommand(turnIntoTextCommand.key))
        } else {
          crepeRef.current.editor.action(callCommand(wrapInHeadingCommand.key, level))
        }
        setBlockType(readBlockType())
      },
      getBlockType: readBlockType,
    }))

    function toggleMode() {
      if (mode === 'wysiwyg') {
        setSourceText(crepeRef.current?.getMarkdown() ?? sourceText)
        setMode('source')
      } else {
        crepeRef.current?.editor.action(replaceAll(sourceText))
        onChangeRef.current(sourceText)
        setMode('wysiwyg')
      }
    }

    return (
      <div className="rounded-lg border border-(--color-border) bg-(--color-bg-card)">
        <div className="sticky top-16 z-10 flex items-center justify-between rounded-t-lg border-b border-(--color-border) bg-(--color-bg-card) p-2">
          {mode === 'wysiwyg' ? (
            <MarkdownToolbar
              onInsert={(text) => crepeRef.current?.editor.action(insert(text))}
              onReset={() => crepeRef.current?.editor.action(replaceAll(''))}
              onSetHeading={(level) => {
                if (!crepeRef.current) return
                if (level === 0) {
                  crepeRef.current.editor.action(callCommand(turnIntoTextCommand.key))
                } else {
                  crepeRef.current.editor.action(callCommand(wrapInHeadingCommand.key, level))
                }
                setBlockType(readBlockType())
              }}
              currentBlockType={blockType}
              onToggleStrong={handleToggleStrong}
              onToggleEmphasis={handleToggleEmphasis}
              onToggleBulletList={handleToggleBulletList}
              onToggleBlockquote={handleToggleBlockquote}
              onToggleLink={handleToggleLink}
            />
          ) : (
            <span className="px-1 text-sm text-(--color-text-secondary)">Source Markdown</span>
          )}
          <button
            type="button"
            onClick={toggleMode}
            className="ml-2 inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-sm hover:bg-(--color-bg-button)"
            aria-label={
              mode === 'wysiwyg' ? 'Afficher la source Markdown' : 'Afficher l’éditeur visuel'
            }
          >
            {mode === 'wysiwyg' ? (
              <>
                <Code className="h-4 w-4" aria-hidden="true" /> Source
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" aria-hidden="true" /> Visuel
              </>
            )}
          </button>
        </div>
        {/* root TOUJOURS monté (caché en CSS) pour ne pas recréer Crepe à la bascule */}
        <div className={mode === 'wysiwyg' ? 'block' : 'hidden'}>
          <div ref={rootRef} className="milkdown-host min-h-[300px]" />
        </div>
        {mode === 'source' && (
          <textarea
            className="min-h-[300px] w-full resize-y bg-(--color-bg-card) p-3 font-mono text-sm text-(--color-text-primary)"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            aria-label="Source Markdown"
          />
        )}
      </div>
    )
  },
)
