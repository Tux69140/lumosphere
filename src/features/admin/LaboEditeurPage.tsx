import { useState } from 'react'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { SAMPLE_MARKDOWN } from '@/components/markdown/sampleDoc'

// Bac-à-sable de l'éditeur Markdown retenu (Milkdown) : édition à gauche,
// source Markdown en direct à droite. Sert à éprouver l'aller-retour et le
// confort hors d'un vrai écran d'entrée.
export function LaboEditeurPage() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN)

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-1 text-xl font-semibold text-(--color-text-primary)">
        Labo éditeur Markdown
      </h1>
      <p className="mb-4 max-w-3xl text-sm text-(--color-text-secondary)">
        Éditeur Milkdown : barre d'outils, tableaux, citations, liens, images, notes de bas de page,
        emojis, bascule source ⇄ visuel. La source Markdown à droite reflète en direct ce que
        produit l'éditeur.
      </p>
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="min-w-0 flex-1">
          <MarkdownEditor value={markdown} onChange={setMarkdown} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-(--color-text-secondary)">
            Source Markdown
          </h2>
          <pre className="max-h-[600px] overflow-auto rounded-lg border border-(--color-border) bg-(--color-bg-card) p-3 text-xs whitespace-pre-wrap text-(--color-text-primary)">
            {markdown}
          </pre>
        </div>
      </div>
    </div>
  )
}
