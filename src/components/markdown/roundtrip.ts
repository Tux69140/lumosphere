import { remark } from 'remark'
import remarkGfm from 'remark-gfm'

// Processeur partagé : CommonMark + GFM (tableaux, notes de bas de page).
// remark = remark-parse + remark-stringify ; remark-gfm ajoute tables/footnotes.
// C'est le SEUL garant testable de la fidélité « Markdown = donnée-maître » :
// il est indépendant de tout moteur d'éditeur.
const processor = remark().use(remarkGfm)

/**
 * Normalise un Markdown en le faisant passer dans le processeur remark.
 * Garantit l'invariant de fidélité : roundtrip(roundtrip(x)) === roundtrip(x).
 */
export function roundtripMarkdown(md: string): string {
  return String(processor.processSync(md))
}
