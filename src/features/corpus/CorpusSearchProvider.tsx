import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { buildThemeTree, toggleThemeNode } from './themeSelection'
import { buildCitationParams } from './buildCitationParams'
import { useOeuvres, useThemes, useKeywords, unwrap } from '@/services/referenceQueries'
import { queryKeys } from '@/services/queryKeys'
import { useUrlFilterState } from './useUrlFilterState'
import { CorpusSearchContext, type CorpusSearchContextValue } from './CorpusSearchContext'
import type { Citation, Keyword, Oeuvre, Theme } from './types'

export function CorpusSearchProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()

  const {
    query,
    setQuery,
    selectedOeuvreIds,
    setSelectedOeuvreIds,
    selectedThemeIds,
    setSelectedThemeIds,
    keywordIds,
    setKeywordIds,
    keywordMode,
    setKeywordMode,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sort,
    setSort,
    favoritesOnly,
    setFavoritesOnly,
    resetAll,
  } = useUrlFilterState()

  const [filtersOpen, setFiltersOpen] = useState(false)

  const oeuvresQuery = useOeuvres()
  const themesQuery = useThemes()
  const keywordsQuery = useKeywords()

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
    sort +
    ' ' +
    (favoritesOnly ? '1' : '0')
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
              favoritesOnly,
            },
            pageParam ?? undefined,
          ),
        ),
      ) as Promise<{ items: Citation[]; next_cursor: string | null }>,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: filtersKey === debouncedKey,
  })

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
    favoritesOnly,
  })
  const countQuery = useQuery({
    queryKey: ['citations', 'count', debouncedKey],
    queryFn: () => unwrap(apiClient.countCitations(countParams)) as Promise<{ total: number }>,
    enabled: filtersKey === debouncedKey,
  })

  const toggleKeyword = useCallback(
    (id: number) =>
      setKeywordIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [setKeywordIds],
  )

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
      favoritesOnly,
      setFavoritesOnly,
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
      reset: resetAll,
      items: searchData?.pages.flatMap((p) => p.items) ?? [],
      loading: searchIsLoading,
      error: searchIsError ? (searchError as Error).message : null,
      hasMore: hasNextPage,
      loadingMore: isFetchingNextPage,
      loadMore: () => {
        void fetchNextPage()
      },
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
        dateTo !== '' ||
        favoritesOnly,
      filtersOpen,
      toggleFilters: () => setFiltersOpen((v) => !v),
    }),
    [
      query,
      setQuery,
      oeuvres,
      themeTree,
      keywords,
      selectedOeuvreIds,
      setSelectedOeuvreIds,
      selectedThemeIds,
      setSelectedThemeIds,
      keywordIds,
      keywordMode,
      dateFrom,
      dateTo,
      sort,
      favoritesOnly,
      setFavoritesOnly,
      setKeywordMode,
      setDateFrom,
      setDateTo,
      setSort,
      resetAll,
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
