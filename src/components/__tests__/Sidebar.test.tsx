import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { Sidebar } from '../Sidebar'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'
import type { CorpusSearchContextValue } from '@/features/corpus/CorpusSearchProvider'

vi.mock('@/features/corpus/useCorpusSearch', () => ({ useCorpusSearch: vi.fn() }))

function mockSearch() {
  const base = {
    query: '',
    setQuery: vi.fn(),
    oeuvres: [],
    themeTree: [],
    selectedOeuvreIds: [],
    selectedThemeIds: [],
    toggleOeuvre: vi.fn(),
    toggleTheme: vi.fn(),
    reset: vi.fn(),
    items: [],
    loading: false,
    error: null,
    hasMore: false,
    hasActiveFilters: false,
  } as unknown as CorpusSearchContextValue
  vi.mocked(useCorpusSearch).mockReturnValue(base)
}

function renderAt(path: string) {
  mockSearch()
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
})
