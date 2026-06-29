import { createContext } from 'react'
import type { Citation, Keyword, Oeuvre, ThemeNode } from './types'

export type CorpusSearchContextValue = {
  query: string
  setQuery: (q: string) => void
  oeuvres: Oeuvre[]
  themeTree: ThemeNode[]
  keywords: Keyword[]
  selectedOeuvreIds: number[]
  selectedThemeIds: number[]
  keywordIds: number[]
  keywordMode: 'AND' | 'OR' | null
  dateFrom: string
  dateTo: string
  sort: 'date' | 'score'
  favoritesOnly: boolean
  setFavoritesOnly: (v: boolean) => void
  toggleOeuvre: (id: number) => void
  toggleTheme: (id: number) => void
  toggleKeyword: (id: number) => void
  setKeywordMode: (mode: 'AND' | 'OR' | null) => void
  setDateFrom: (d: string) => void
  setDateTo: (d: string) => void
  setSort: (s: 'date' | 'score') => void
  reset: () => void
  items: Citation[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => void
  refresh: () => void
  total: number | null
  hasActiveFilters: boolean
  filtersOpen: boolean
  toggleFilters: () => void
}

export const CorpusSearchContext = createContext<CorpusSearchContextValue | null>(null)
