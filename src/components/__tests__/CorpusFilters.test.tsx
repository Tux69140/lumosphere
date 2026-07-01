import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CorpusFilters } from '../CorpusFilters'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'
import type { CorpusSearchContextValue } from '@/features/corpus/CorpusSearchContext'

vi.mock('@/features/corpus/useCorpusSearch', () => ({ useCorpusSearch: vi.fn() }))

function makeSearch(overrides?: Partial<CorpusSearchContextValue>): CorpusSearchContextValue {
  return {
    query: '',
    setQuery: vi.fn(),
    oeuvres: [{ id: 1, nom: 'Œuvre Test', auteur_nom: 'Auteur' }],
    themeTree: [],
    keywords: [],
    selectedOeuvreIds: [],
    selectedThemeIds: [],
    keywordIds: [],
    keywordMode: null,
    dateFrom: '',
    dateTo: '',
    sort: 'date',
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
    hasActiveFilters: false,
    filtersOpen: false,
    toggleFilters: vi.fn(),
    ...overrides,
  } as CorpusSearchContextValue
}

describe('CorpusFilters', () => {
  it('affiche le champ de recherche et appelle setQuery à la saisie', async () => {
    const setQuery = vi.fn()
    vi.mocked(useCorpusSearch).mockReturnValue(makeSearch({ setQuery }))
    render(<CorpusFilters />)
    const input = screen.getByLabelText('Rechercher dans le contenu')
    expect(input).toBeInTheDocument()
    await userEvent.type(input, 'test')
    expect(setQuery).toHaveBeenCalled()
  })

  it('cocher une œuvre appelle toggleOeuvre avec son id', async () => {
    const toggleOeuvre = vi.fn()
    vi.mocked(useCorpusSearch).mockReturnValue(makeSearch({ toggleOeuvre }))
    render(<CorpusFilters />)
    await userEvent.click(screen.getByLabelText('Œuvre Test'))
    expect(toggleOeuvre).toHaveBeenCalledWith(1)
  })

  it('ne rend plus le bouton Réinitialiser (déplacé dans le pied de la Sidebar)', () => {
    vi.mocked(useCorpusSearch).mockReturnValue(makeSearch({ hasActiveFilters: true }))
    render(<CorpusFilters />)
    expect(screen.queryByRole('button', { name: /réinitialiser/i })).not.toBeInTheDocument()
  })

  it('mode OU/ET des mots-clés visible même sans mot-clé sélectionné', () => {
    vi.mocked(useCorpusSearch).mockReturnValue(
      makeSearch({ keywords: [{ id: 1, mot: 'paix' }], keywordIds: [] }),
    )
    render(<CorpusFilters />)
    expect(screen.getByRole('button', { name: 'OU' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ET' })).toBeInTheDocument()
  })
})
