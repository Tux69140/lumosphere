import { forwardRef, lazy, Suspense } from 'react'
import type { MarkdownEditorHandle, MarkdownEditorProps } from './markdown/types'

export type { MarkdownEditorHandle, MarkdownEditorProps } from './markdown/types'

// Façade : le reste de l'application consomme UNIQUEMENT ce composant et son
// interface value/onChange. Moteur retenu (re-challenge T15) : Milkdown.
// Chargé en différé (lazy) pour sortir ProseMirror/Milkdown du bundle principal.
const MilkdownEditor = lazy(() =>
  import('./markdown/MilkdownEditor').then((m) => ({ default: m.MilkdownEditor })),
)

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor(props, ref) {
    return (
      <Suspense
        fallback={
          <div className="min-h-[300px] rounded-lg border border-(--color-border) bg-(--color-bg-card) p-3 text-sm text-(--color-text-secondary)">
            Chargement de l’éditeur…
          </div>
        }
      >
        <MilkdownEditor ref={ref} {...props} />
      </Suspense>
    )
  },
)
