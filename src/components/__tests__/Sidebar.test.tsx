import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Sidebar } from '../Sidebar'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'
import type { CorpusSearchContextValue } from '@/features/corpus/CorpusSearchProvider'

vi.mock('@/features/corpus/useCorpusSearch', () => ({ useCorpusSearch: vi.fn() }))

function mockSearch(over: Partial<CorpusSearchContextValue> = {}) {
  const base: CorpusSearchContextValue = {
    query: '',
    setQuery: vi.fn(),
    oeuvres: [{ id: 1, nom: 'Évangiles', auteur_nom: 'Anonyme' }],
    themeTree: [
      { id: 10, nom: 'Spiritualité', children: [{ id: 11, nom: 'Prière', parent_id: 10 }] },
    ],
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
    ...over,
  }
  vi.mocked(useCorpusSearch).mockReturnValue(base)
  return base
}

describe('Sidebar', () => {
  it('le champ de recherche est actif et reflète la valeur', () => {
    mockSearch({ query: 'âme' })
    render(<Sidebar />)
    const input = screen.getByLabelText('Rechercher dans le contenu') as HTMLInputElement
    expect(input).not.toBeDisabled()
    expect(input.value).toBe('âme')
  })

  it('affiche les œuvres et thèmes (parent + enfant)', () => {
    mockSearch()
    render(<Sidebar />)
    expect(screen.getByLabelText('Évangiles')).toBeInTheDocument()
    expect(screen.getByLabelText('Spiritualité')).toBeInTheDocument()
    expect(screen.getByLabelText('Prière')).toBeInTheDocument()
  })

  it('le bouton Réinitialiser n’apparaît que si des filtres sont actifs', () => {
    mockSearch({ hasActiveFilters: false })
    const { rerender } = render(<Sidebar />)
    expect(screen.queryByRole('button', { name: 'Réinitialiser' })).toBeNull()
    mockSearch({ hasActiveFilters: true })
    rerender(<Sidebar />)
    expect(screen.getByRole('button', { name: 'Réinitialiser' })).toBeInTheDocument()
  })
})
