import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { buildThemeTree, toggleThemeNode } from './themeSelection'
import { buildCitationParams } from './buildCitationParams'
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
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([])
  const [themes, setThemes] = useState<Theme[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [selectedOeuvreIds, setSelectedOeuvreIds] = useState<number[]>([])
  const [selectedThemeIds, setSelectedThemeIds] = useState<number[]>([])
  const [keywordIds, setKeywordIds] = useState<number[]>([])
  const [keywordMode, setKeywordMode] = useState<'AND' | 'OR' | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<'date' | 'score'>('date')
  const [items, setItems] = useState<Citation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  const themeTree = useMemo(() => buildThemeTree(themes), [themes])

  useEffect(() => {
    apiClient.findOeuvres().then((res) => {
      if (res.status === 'ok' && res.data) setOeuvres(res.data as Oeuvre[])
      else if (res.status !== 'ok') toast.error('Impossible de charger les œuvres.')
    })
    apiClient.findThemes().then((res) => {
      if (res.status === 'ok' && res.data) setThemes(res.data as Theme[])
      else if (res.status !== 'ok') toast.error('Impossible de charger les thèmes.')
    })
    apiClient.findKeywords().then((res) => {
      if (res.status === 'ok' && res.data) setKeywords(res.data as Keyword[])
      else if (res.status !== 'ok') toast.error('Impossible de charger les mots-clés.')
    })
  }, [])

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

  const filtersRef = useRef({
    query,
    selectedOeuvreIds,
    selectedThemeIds,
    keywordIds,
    keywordMode,
    dateFrom,
    dateTo,
    sort,
  })
  // eslint-disable-next-line react-hooks/refs
  filtersRef.current = {
    query,
    selectedOeuvreIds,
    selectedThemeIds,
    keywordIds,
    keywordMode,
    dateFrom,
    dateTo,
    sort,
  }

  const nextCursorRef = useRef<string | null>(null)
  // eslint-disable-next-line react-hooks/refs
  nextCursorRef.current = nextCursor
  const loadingMoreRef = useRef(false)
  const searchGenRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    searchGenRef.current += 1
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    const {
      query: q,
      selectedOeuvreIds: oi,
      selectedThemeIds: ti,
      keywordIds: ki,
      keywordMode: km,
      dateFrom: df,
      dateTo: dt,
      sort: s,
    } = filtersRef.current
    apiClient
      .findCitations(
        buildCitationParams({
          query: q,
          oeuvreIds: oi,
          themeIds: ti,
          keywordIds: ki,
          keywordMode: km,
          dateFrom: df,
          dateTo: dt,
          sort: s,
        }),
      )
      .then((res) => {
        if (cancelled) return
        if (res.status === 'ok' && res.data) {
          setItems(res.data.items as Citation[])
          setNextCursor(res.data.next_cursor)
        } else {
          setError(res.errors?.[0] ?? 'Erreur de chargement')
        }
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de contacter le serveur')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedKey, refreshTick])

  const loadMore = useCallback(() => {
    const cursor = nextCursorRef.current
    if (cursor === null || loadingMoreRef.current) return
    loadingMoreRef.current = true
    const gen = searchGenRef.current
    setLoadingMore(true)
    const {
      query: q,
      selectedOeuvreIds: oi,
      selectedThemeIds: ti,
      keywordIds: ki,
      keywordMode: km,
      dateFrom: df,
      dateTo: dt,
      sort: s,
    } = filtersRef.current
    apiClient
      .findCitations(
        buildCitationParams(
          {
            query: q,
            oeuvreIds: oi,
            themeIds: ti,
            keywordIds: ki,
            keywordMode: km,
            dateFrom: df,
            dateTo: dt,
            sort: s,
          },
          cursor,
        ),
      )
      .then((res) => {
        if (gen !== searchGenRef.current) return
        if (res.status === 'ok' && res.data) {
          setItems((prev) => [...prev, ...(res.data!.items as Citation[])])
          setNextCursor(res.data.next_cursor)
        }
      })
      .finally(() => {
        loadingMoreRef.current = false
        setLoadingMore(false)
      })
  }, [])

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
    items,
    loading,
    error,
    hasMore: nextCursor !== null,
    loadingMore,
    loadMore,
    refresh: () => setRefreshTick((t) => t + 1),
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
