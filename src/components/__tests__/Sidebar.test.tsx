import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { Sidebar } from '../Sidebar'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'
import type { CorpusSearchContextValue } from '@/features/corpus/CorpusSearchContext'

vi.mock('@/features/corpus/useCorpusSearch', () => ({ useCorpusSearch: vi.fn() }))

function mockSearch(overrides: Record<string, unknown> = {}) {
  const base = {
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
  } as unknown as CorpusSearchContextValue
  vi.mocked(useCorpusSearch).mockReturnValue(base)
}

function renderAt(path: string, overrides: Record<string, unknown> = {}) {
  mockSearch(overrides)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  it('hors admin : affiche le champ de recherche', () => {
    renderAt('/')
    expect(screen.getByLabelText('Rechercher dans le contenu')).toBeInTheDocument()
  })

  it('en section admin : affiche le menu admin, pas la recherche', () => {
    renderAt('/admin/utilisateurs')
    expect(screen.getByRole('link', { name: /utilisateurs/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /rôles et droits/i })).toBeInTheDocument()
    expect(screen.queryByLabelText('Rechercher dans le contenu')).not.toBeInTheDocument()
  })

  it('hors admin : bouton Réinitialiser toujours présent, désactivé sans filtre actif', () => {
    renderAt('/', { hasActiveFilters: false })
    expect(screen.getByRole('button', { name: /réinitialiser/i })).toBeDisabled()
  })

  it('hors admin : bouton Réinitialiser actif si des filtres sont posés, et déclenche reset', async () => {
    const reset = vi.fn()
    renderAt('/', { hasActiveFilters: true, reset })
    const button = screen.getByRole('button', { name: /réinitialiser/i })
    expect(button).toBeEnabled()
    button.click()
    expect(reset).toHaveBeenCalled()
  })

  it('hors admin : affiche le crédit Lulumineuse dans le pied', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: /lulumineuse/i })).toBeInTheDocument()
  })

  it("en section admin : n'affiche pas le pied de filtres (Réinitialiser / crédit)", () => {
    renderAt('/admin/utilisateurs')
    expect(screen.queryByRole('button', { name: /réinitialiser/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /lulumineuse/i })).not.toBeInTheDocument()
  })
})
