export type Oeuvre = { id: number; nom: string; auteur_nom: string | null }

export type Theme = { id: number; nom: string; parent_id: number | null }

export type ThemeNode = { id: number; nom: string; children: Theme[] }

export type CheckState = 'checked' | 'indeterminate' | 'unchecked'

export type CorpusFilters = { query: string; oeuvreIds: number[]; themeIds: number[] }

export type Citation = {
  id: number
  contenu: string
  oeuvre_nom: string | null
  auteur_nom: string | null
  theme_nom: string | null
  notes: string | null
  mots_cles: { id: number; mot: string }[]
}
