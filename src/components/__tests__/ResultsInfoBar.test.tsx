import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ResultsInfoBar } from '../ResultsInfoBar'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'
import type { CorpusSearchContextValue } from '@/features/corpus/CorpusSearchContext'

vi.mock('@/features/corpus/useCorpusSearch', () => ({ useCorpusSearch: vi.fn() }))

function makeSearch(overrides?: Partial<CorpusSearchContextValue>): CorpusSearchContextValue {
  return {
    query: '',
    setQuery: vi.fn(),
    oeuvres: [],
    themeTree: [],
    keywords: [],
    selectedOeuvreIds: [],
    selectedThemeIds: [],
    keywordIds: [],
    keywordMode: null,
    dateFrom: '',
    dateTo: '',
    sort: 'date',
    favoritesOnly: false,
    setFavoritesOnly: vi.fn(),
    toggleOeuvre: vi.fn(),
    toggleTheme: vi.fn(),
    toggleKeyword: vi.fn(),
    setKeywordMode: vi.fn(),
    setDateFrom: vi.fn(),
    setDateTo: vi.fn(),
    setSort: vi.fn(),
    reset: vi.fn(),
    items: [],
    loading: false,
    error: null,
    hasMore: false,
    loadingMore: false,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    total: 0,
    hasActiveFilters: false,
    filtersOpen: false,
    toggleFilters: vi.fn(),
    ...overrides,
  } as CorpusSearchContextValue
}

describe('ResultsInfoBar', () => {
  it('affiche le tri en permanence, Pertinence désactivée sans recherche', () => {
    vi.mocked(useCorpusSearch).mockReturnValue(makeSearch({ query: '' }))
    render(<ResultsInfoBar />)
    expect(screen.getByText('Afficher par :')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Date' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Pertinence' })).toBeDisabled()
  })

  it('active Pertinence quand une recherche est saisie', () => {
    vi.mocked(useCorpusSearch).mockReturnValue(makeSearch({ query: 'âme' }))
    render(<ResultsInfoBar />)
    expect(screen.getByRole('button', { name: 'Pertinence' })).toBeEnabled()
  })

  it('affiche le compteur de résultats', () => {
    vi.mocked(useCorpusSearch).mockReturnValue(makeSearch({ total: 42 }))
    render(<ResultsInfoBar />)
    expect(screen.getByRole('status')).toHaveTextContent('42 résultats')
  })

  it("n'affiche pas de cadre quand il n'y a pas de message de statut", () => {
    vi.mocked(useCorpusSearch).mockReturnValue(makeSearch())
    render(<ResultsInfoBar />)
    const bar = screen.getByRole('status').parentElement
    expect(bar?.className).not.toContain('border')
  })

  it('conserve les pastilles de filtres actifs', () => {
    vi.mocked(useCorpusSearch).mockReturnValue(makeSearch({ hasActiveFilters: true, query: 'âme' }))
    render(<ResultsInfoBar />)
    expect(screen.getByText('Recherche : « âme »')).toBeInTheDocument()
  })
})
