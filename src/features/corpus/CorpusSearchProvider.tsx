import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
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
  total: number | null
  hasActiveFilters: boolean
  filtersOpen: boolean
  toggleFilters: () => void
}

export const CorpusSearchContext = createContext<CorpusSearchContextValue | null>(null)

export function CorpusSearchProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()

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

  // useMemo pour stabiliser la référence tableau (évite deps instables dans la valeur mémoisée).
  const oeuvres = useMemo<Oeuvre[]>(
    () => (oeuvresQuery.data as Oeuvre[] | undefined) ?? [],
    [oeuvresQuery.data],
  )
  const keywords = useMemo<Keyword[]>(
    () => (keywordsQuery.data as Keyword[] | undefined) ?? [],
    [keywordsQuery.data],
  )

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

  // C1 — queryFn aligné sur debouncedKey : enabled=false pendant le debounce
  // évite que fetchNextPage mélange des résultats de deux recherches différentes.
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
    enabled: filtersKey === debouncedKey,
  })

  // Destructure pour des deps exhaustive-deps propres dans useMemo.
  const {
    data: searchData,
    isLoading: searchIsLoading,
    isError: searchIsError,
    error: searchError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = search

  const countParams = buildCitationParams({
    query,
    oeuvreIds: selectedOeuvreIds,
    themeIds: selectedThemeIds,
    keywordIds,
    keywordMode,
    dateFrom,
    dateTo,
    sort,
  })
  const countQuery = useQuery({
    queryKey: ['citations', 'count', debouncedKey],
    queryFn: () => unwrap(apiClient.countCitations(countParams)) as Promise<{ total: number }>,
    enabled: filtersKey === debouncedKey,
  })

  const toggleKeyword = useCallback(
    (id: number) =>
      setKeywordIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [],
  )

  // I5 — value mémoisé pour éviter les re-renders en cascade sur les consommateurs.
  const value = useMemo<CorpusSearchContextValue>(
    () => ({
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
      items: searchData?.pages.flatMap((p) => p.items) ?? [],
      loading: searchIsLoading,
      error: searchIsError ? (searchError as Error).message : null,
      hasMore: hasNextPage,
      loadingMore: isFetchingNextPage,
      loadMore: () => {
        void fetchNextPage()
      },
      // I3 — resetQueries repart de la page 1 (refetch rechargerait N pages en série).
      refresh: () => {
        void qc.resetQueries({ queryKey: queryKeys.citationsSearch(debouncedKey) })
      },
      total: countQuery.data?.total ?? null,
      hasActiveFilters:
        query.trim() !== '' ||
        selectedOeuvreIds.length > 0 ||
        selectedThemeIds.length > 0 ||
        keywordIds.length > 0 ||
        dateFrom !== '' ||
        dateTo !== '',
      filtersOpen,
      toggleFilters: () => setFiltersOpen((v) => !v),
    }),
    [
      query,
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
      toggleKeyword,
      searchData,
      searchIsLoading,
      searchIsError,
      searchError,
      hasNextPage,
      isFetchingNextPage,
      fetchNextPage,
      debouncedKey,
      qc,
      filtersOpen,
      countQuery.data,
    ],
  )

  return <CorpusSearchContext.Provider value={value}>{children}</CorpusSearchContext.Provider>
}
