// Interface de l'éditeur Markdown (moteur retenu : Milkdown).
// Le reste de l'application ne dépend QUE de ces types — jamais du moteur concret.
// Donnée échangée = Markdown (donnée-maître), en entrée comme en sortie.

export type MarkdownEditorHandle = {
  /** Insère du texte Markdown au curseur (ou en fin de document). */
  insertText: (text: string) => void
  /** Vide l'éditeur. */
  reset: () => void
  /** Renvoie le Markdown courant. */
  getMarkdown: () => string
}

export type MarkdownEditorProps = {
  /** Markdown initial (non contrôlé après le montage : édité en interne). */
  value: string
  /** Notifié à chaque modification, avec le Markdown sérialisé. */
  onChange: (markdown: string) => void
  /** Lecture seule. */
  readOnly?: boolean
}
