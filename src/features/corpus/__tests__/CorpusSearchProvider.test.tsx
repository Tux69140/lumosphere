import { render, screen, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CorpusSearchProvider } from '@/features/corpus/CorpusSearchProvider'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'

vi.mock('@/services/api', () => ({
  apiClient: {
    findOeuvres: vi.fn().mockResolvedValue({ status: 'ok', data: [], errors: [] }),
    findThemes: vi.fn().mockResolvedValue({ status: 'ok', data: [], errors: [] }),
    findCitations: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { items: [], next_cursor: null }, errors: [] }),
  },
}))

import { apiClient } from '@/services/api'

function Probe() {
  const { setQuery, loading } = useCorpusSearch()
  return (
    <div>
      <span>{loading ? 'loading' : 'idle'}</span>
      <button onClick={() => setQuery('âme')}>chercher</button>
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
    render(
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
    render(
      <CorpusSearchProvider>
        <Probe />
      </CorpusSearchProvider>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    act(() => screen.getByText('chercher').click())
    act(() => vi.advanceTimersByTime(500))
    await waitFor(() => expect(apiClient.findCitations).toHaveBeenLastCalledWith({ q: 'âme' }))
  })
})
