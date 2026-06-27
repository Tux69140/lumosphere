import { screen, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'
import { CorpusSearchProvider } from '@/features/corpus/CorpusSearchProvider'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'

vi.mock('@/services/api', () => ({
  apiClient: {
    findOeuvres: vi.fn().mockResolvedValue({ status: 'ok', data: [], errors: [] }),
    findThemes: vi.fn().mockResolvedValue({ status: 'ok', data: [], errors: [] }),
    findKeywords: vi.fn().mockResolvedValue({ status: 'ok', data: [], errors: [] }),
    findCitations: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { items: [], next_cursor: null }, errors: [] }),
  },
}))

import { apiClient } from '@/services/api'

function Probe() {
  const {
    setQuery,
    loading,
    keywordIds,
    keywordMode,
    dateFrom,
    dateTo,
    sort,
    toggleKeyword,
    setKeywordMode,
    setDateFrom,
    setDateTo,
    setSort,
  } = useCorpusSearch()
  return (
    <div>
      <span>{loading ? 'loading' : 'idle'}</span>
      <span data-testid="kw-ids">{keywordIds.join(',')}</span>
      <span data-testid="kw-mode">{keywordMode ?? 'null'}</span>
      <span data-testid="date-from">{dateFrom}</span>
      <span data-testid="date-to">{dateTo}</span>
      <span data-testid="sort">{sort}</span>
      <button onClick={() => setQuery('âme')}>chercher</button>
      <button onClick={() => toggleKeyword(1)}>kw1</button>
      <button onClick={() => toggleKeyword(2)}>kw2</button>
      <button onClick={() => setKeywordMode('AND')}>mode-and</button>
      <button onClick={() => setKeywordMode('OR')}>mode-or</button>
      <button onClick={() => setDateFrom('2024-01-01')}>date-from</button>
      <button onClick={() => setDateTo('2024-12-31')}>date-to</button>
      <button onClick={() => setSort('score')}>sort-score</button>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('CorpusSearchProvider', () => {
  it('charge les citations au montage', async () => {
    renderWithClient(
      <CorpusSearchProvider>
        <Probe />
      </CorpusSearchProvider>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(apiClient.findCitations).toHaveBeenCalledWith({})
  })

  it('relance une recherche débouncée avec q après saisie', async () => {
    renderWithClient(
      <CorpusSearchProvider>
        <Probe />
      </CorpusSearchProvider>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    act(() => screen.getByText('chercher').click())
    act(() => vi.advanceTimersByTime(300))
    await waitFor(() => expect(apiClient.findCitations).toHaveBeenLastCalledWith({ q: 'âme' }))
  })

  it('toggleKeyword ajoute et retire les IDs de mots-clés', async () => {
    renderWithClient(
      <CorpusSearchProvider>
        <Probe />
      </CorpusSearchProvider>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    act(() => screen.getByText('kw1').click())
    expect(screen.getByTestId('kw-ids').textContent).toBe('1')
    act(() => screen.getByText('kw2').click())
    expect(screen.getByTestId('kw-ids').textContent).toBe('1,2')
    act(() => screen.getByText('kw1').click())
    expect(screen.getByTestId('kw-ids').textContent).toBe('2')
  })

  it('setKeywordMode met à jour le mode ET/OU', async () => {
    renderWithClient(
      <CorpusSearchProvider>
        <Probe />
      </CorpusSearchProvider>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByTestId('kw-mode').textContent).toBe('null')
    act(() => screen.getByText('mode-and').click())
    expect(screen.getByTestId('kw-mode').textContent).toBe('AND')
    act(() => screen.getByText('mode-or').click())
    expect(screen.getByTestId('kw-mode').textContent).toBe('OR')
  })

  it('les dates sont incluses dans la clé de debounce', async () => {
    renderWithClient(
      <CorpusSearchProvider>
        <Probe />
      </CorpusSearchProvider>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    act(() => screen.getByText('date-from').click())
    act(() => screen.getByText('date-to').click())
    expect(screen.getByTestId('date-from').textContent).toBe('2024-01-01')
    expect(screen.getByTestId('date-to').textContent).toBe('2024-12-31')
    act(() => vi.advanceTimersByTime(300))
    await waitFor(() =>
      expect(apiClient.findCitations).toHaveBeenLastCalledWith({
        date_from: '2024-01-01',
        date_to: '2024-12-31',
      }),
    )
  })

  it('setSort met à jour le tri et passe sort=score quand query est vide', async () => {
    renderWithClient(
      <CorpusSearchProvider>
        <Probe />
      </CorpusSearchProvider>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByTestId('sort').textContent).toBe('date')
    act(() => screen.getByText('sort-score').click())
    expect(screen.getByTestId('sort').textContent).toBe('score')
    act(() => vi.advanceTimersByTime(300))
    await waitFor(() => expect(apiClient.findCitations).toHaveBeenLastCalledWith({}))
  })

  it('passe keyword_ids et keyword_mode dans les params après debounce', async () => {
    renderWithClient(
      <CorpusSearchProvider>
        <Probe />
      </CorpusSearchProvider>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    act(() => screen.getByText('kw1').click())
    act(() => screen.getByText('kw2').click())
    act(() => screen.getByText('mode-and').click())
    act(() => vi.advanceTimersByTime(300))
    await waitFor(() =>
      expect(apiClient.findCitations).toHaveBeenLastCalledWith({
        keyword_ids: '1,2',
        keyword_mode: 'and',
      }),
    )
  })
})
