import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { apiClient } from '@/services/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { buildThemeTree, toggleThemeNode } from './themeSelection'
import { buildCitationParams } from './buildCitationParams'
import type { Citation, Oeuvre, Theme, ThemeNode } from './types'

export type CorpusSearchContextValue = {
  query: string
  setQuery: (q: string) => void
  oeuvres: Oeuvre[]
  themeTree: ThemeNode[]
  selectedOeuvreIds: number[]
  selectedThemeIds: number[]
  toggleOeuvre: (id: number) => void
  toggleTheme: (id: number) => void
  reset: () => void
  items: Citation[]
  loading: boolean
  error: string | null
  hasMore: boolean
  hasActiveFilters: boolean
}

export const CorpusSearchContext = createContext<CorpusSearchContextValue | null>(null)

export function CorpusSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('')
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([])
  const [themes, setThemes] = useState<Theme[]>([])
  const [selectedOeuvreIds, setSelectedOeuvreIds] = useState<number[]>([])
  const [selectedThemeIds, setSelectedThemeIds] = useState<number[]>([])
  const [items, setItems] = useState<Citation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const themeTree = useMemo(() => buildThemeTree(themes), [themes])

  // Référentiels chargés une fois.
  useEffect(() => {
    apiClient.findOeuvres().then((res) => {
      if (res.status === 'ok' && res.data) setOeuvres(res.data as Oeuvre[])
    })
    apiClient.findThemes().then((res) => {
      if (res.status === 'ok' && res.data) setThemes(res.data as Theme[])
    })
  }, [])

  // Clé primitive débouncée (évite de réarmer le timer à chaque rendu).
  const filtersKey =
    query.trim() +
    ' ' +
    [...selectedOeuvreIds].sort((a, b) => a - b).join(',') +
    ' ' +
    [...selectedThemeIds].sort((a, b) => a - b).join(',')
  const debouncedKey = useDebouncedValue(filtersKey, 500)

  // Valeurs courantes lues au moment du fetch (cohérentes avec la clé débouncée).
  const filtersRef = useRef({ query, selectedOeuvreIds, selectedThemeIds })
  // eslint-disable-next-line react-hooks/refs
  filtersRef.current = { query, selectedOeuvreIds, selectedThemeIds }

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    const { query: q, selectedOeuvreIds: oi, selectedThemeIds: ti } = filtersRef.current
    apiClient
      .findCitations(buildCitationParams({ query: q, oeuvreIds: oi, themeIds: ti }))
      .then((res) => {
        if (cancelled) return
        if (res.status === 'ok' && res.data) {
          setItems(res.data.items as Citation[])
          setHasMore(res.data.next_cursor !== null)
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
  }, [debouncedKey])

  const value: CorpusSearchContextValue = {
    query,
    setQuery,
    oeuvres,
    themeTree,
    selectedOeuvreIds,
    selectedThemeIds,
    toggleOeuvre: (id) =>
      setSelectedOeuvreIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      ),
    toggleTheme: (id) => setSelectedThemeIds((prev) => toggleThemeNode(prev, themeTree, id)),
    reset: () => {
      setQuery('')
      setSelectedOeuvreIds([])
      setSelectedThemeIds([])
    },
    items,
    loading,
    error,
    hasMore,
    hasActiveFilters:
      query.trim() !== '' || selectedOeuvreIds.length > 0 || selectedThemeIds.length > 0,
  }

  return <CorpusSearchContext.Provider value={value}>{children}</CorpusSearchContext.Provider>
}
