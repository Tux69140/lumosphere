import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { buildThemeTree, toggleThemeNode } from './themeSelection'
import { buildCitationParams } from './buildCitationParams'
import { useOeuvres, useThemes, useKeywords, unwrap } from '@/services/referenceQueries'
import { queryKeys } from '@/services/queryKeys'
import type { Citation, Keyword, Oeuvre, Theme, ThemeNode } from './types'

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
  hasActiveFilters: boolean
  filtersOpen: boolean
  toggleFilters: () => void
}

export const CorpusSearchContext = createContext<CorpusSearchContextValue | null>(null)

export function CorpusSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('')
  const [selectedOeuvreIds, setSelectedOeuvreIds] = useState<number[]>([])
  const [selectedThemeIds, setSelectedThemeIds] = useState<number[]>([])
  const [keywordIds, setKeywordIds] = useState<number[]>([])
  const [keywordMode, setKeywordMode] = useState<'AND' | 'OR' | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<'date' | 'score'>('date')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Référentiels via TanStack Query (cache partagé, toast centralisé sur erreur).
  const oeuvresQuery = useOeuvres()
  const themesQuery = useThemes()
  const keywordsQuery = useKeywords()

  const oeuvres = (oeuvresQuery.data as Oeuvre[] | undefined) ?? []
  const keywords = (keywordsQuery.data as Keyword[] | undefined) ?? []

  const themeTree = useMemo(
    () => buildThemeTree((themesQuery.data as Theme[] | undefined) ?? []),
    [themesQuery.data],
  )

  const filtersKey =
    query.trim() +
    ' ' +
    [...selectedOeuvreIds].sort((a, b) => a - b).join(',') +
    ' ' +
    [...selectedThemeIds].sort((a, b) => a - b).join(',') +
    ' ' +
    [...keywordIds].sort((a, b) => a - b).join(',') +
    ' ' +
    (keywordMode ?? '') +
    ' ' +
    dateFrom +
    ' ' +
    dateTo +
    ' ' +
    sort
  const debouncedKey = useDebouncedValue(filtersKey, 300)

  const search = useInfiniteQuery({
    queryKey: queryKeys.citationsSearch(debouncedKey),
    queryFn: ({ pageParam }) =>
      unwrap(
        apiClient.findCitations(
          buildCitationParams(
            {
              query,
              oeuvreIds: selectedOeuvreIds,
              themeIds: selectedThemeIds,
              keywordIds,
              keywordMode,
              dateFrom,
              dateTo,
              sort,
            },
            pageParam ?? undefined,
          ),
        ),
      ) as Promise<{ items: Citation[]; next_cursor: string | null }>,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  })

  const toggleKeyword = useCallback(
    (id: number) =>
      setKeywordIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [],
  )

  const value: CorpusSearchContextValue = {
    query,
    setQuery,
    oeuvres,
    themeTree,
    keywords,
    selectedOeuvreIds,
    selectedThemeIds,
    keywordIds,
    keywordMode,
    dateFrom,
    dateTo,
    sort,
    toggleOeuvre: (id) =>
      setSelectedOeuvreIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      ),
    toggleTheme: (id) => setSelectedThemeIds((prev) => toggleThemeNode(prev, themeTree, id)),
    toggleKeyword,
    setKeywordMode,
    setDateFrom,
    setDateTo,
    setSort,
    reset: () => {
      setQuery('')
      setSelectedOeuvreIds([])
      setSelectedThemeIds([])
      setKeywordIds([])
      setKeywordMode(null)
      setDateFrom('')
      setDateTo('')
      setSort('date')
    },
    items: search.data?.pages.flatMap((p) => p.items) ?? [],
    loading: search.isLoading,
    error: search.isError ? (search.error as Error).message : null,
    hasMore: search.hasNextPage,
    loadingMore: search.isFetchingNextPage,
    loadMore: () => {
      void search.fetchNextPage()
    },
    refresh: () => {
      void search.refetch()
    },
    hasActiveFilters:
      query.trim() !== '' ||
      selectedOeuvreIds.length > 0 ||
      selectedThemeIds.length > 0 ||
      keywordIds.length > 0 ||
      dateFrom !== '' ||
      dateTo !== '',
    filtersOpen,
    toggleFilters: () => setFiltersOpen((v) => !v),
  }

  return <CorpusSearchContext.Provider value={value}>{children}</CorpusSearchContext.Provider>
}
