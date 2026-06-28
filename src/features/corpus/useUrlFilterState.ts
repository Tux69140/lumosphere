import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

function parseIds(raw: string | null): number[] {
  if (!raw) return []
  return raw
    .split(',')
    .map(Number)
    .filter((n) => n > 0)
}

function serializeIds(ids: number[]): string {
  return [...ids].sort((a, b) => a - b).join(',')
}

export type UrlFilterState = {
  query: string
  setQuery: (q: string) => void
  selectedOeuvreIds: number[]
  setSelectedOeuvreIds: (fn: (prev: number[]) => number[]) => void
  selectedThemeIds: number[]
  setSelectedThemeIds: (fn: (prev: number[]) => number[]) => void
  keywordIds: number[]
  setKeywordIds: (fn: (prev: number[]) => number[]) => void
  keywordMode: 'AND' | 'OR' | null
  setKeywordMode: (mode: 'AND' | 'OR' | null) => void
  dateFrom: string
  setDateFrom: (d: string) => void
  dateTo: string
  setDateTo: (d: string) => void
  sort: 'date' | 'score'
  setSort: (s: 'date' | 'score') => void
  favoritesOnly: boolean
  setFavoritesOnly: (v: boolean) => void
  resetAll: () => void
}

function parseKwMode(raw: string | null): 'AND' | 'OR' | null {
  if (raw === 'and') return 'AND'
  if (raw === 'or') return 'OR'
  return null
}

export function useUrlFilterState(): UrlFilterState {
  const [searchParams, setSearchParams] = useSearchParams()

  const query = searchParams.get('q') ?? ''
  const selectedOeuvreIds = parseIds(searchParams.get('oeuvres'))
  const selectedThemeIds = parseIds(searchParams.get('themes'))
  const keywordIds = parseIds(searchParams.get('keywords'))
  const keywordMode = parseKwMode(searchParams.get('kw_mode'))
  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''
  const sort: 'date' | 'score' = searchParams.get('sort') === 'score' ? 'score' : 'date'
  const favoritesOnly = searchParams.get('favoris') === '1'

  const updateKey = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value === null || value === '') {
            next.delete(key)
          } else {
            next.set(key, value)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setQuery = useCallback((q: string) => updateKey('q', q || null), [updateKey])

  const setSelectedOeuvreIds = useCallback(
    (fn: (prev: number[]) => number[]) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const ids = fn(parseIds(prev.get('oeuvres')))
          if (ids.length) next.set('oeuvres', serializeIds(ids))
          else next.delete('oeuvres')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setSelectedThemeIds = useCallback(
    (fn: (prev: number[]) => number[]) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const ids = fn(parseIds(prev.get('themes')))
          if (ids.length) next.set('themes', serializeIds(ids))
          else next.delete('themes')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setKeywordIds = useCallback(
    (fn: (prev: number[]) => number[]) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const ids = fn(parseIds(prev.get('keywords')))
          if (ids.length) next.set('keywords', serializeIds(ids))
          else next.delete('keywords')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setKeywordMode = useCallback(
    (mode: 'AND' | 'OR' | null) => updateKey('kw_mode', mode?.toLowerCase() ?? null),
    [updateKey],
  )
  const setDateFrom = useCallback((d: string) => updateKey('date_from', d || null), [updateKey])
  const setDateTo = useCallback((d: string) => updateKey('date_to', d || null), [updateKey])
  const setSort = useCallback(
    (s: 'date' | 'score') => updateKey('sort', s === 'date' ? null : 'score'),
    [updateKey],
  )
  const setFavoritesOnly = useCallback(
    (v: boolean) => updateKey('favoris', v ? '1' : null),
    [updateKey],
  )

  const resetAll = useCallback(() => {
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  return {
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
  }
}
