import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pollLotsUntilDone } from '../useCollecte'

vi.mock('@/services/api', () => ({
  apiClient: { findLots: vi.fn() },
}))
import { apiClient } from '@/services/api'

describe('pollLotsUntilDone', () => {
  beforeEach(() => vi.clearAllMocks())

  it('appelle onDone quand tous les lots quittent en_traitement', async () => {
    vi.mocked(apiClient.findLots)
      .mockResolvedValueOnce({
        status: 'ok',
        data: { items: [{ nom: 'L1', status: 'en_traitement' }], next_cursor: null },
        errors: [],
      })
      .mockResolvedValueOnce({
        status: 'ok',
        data: { items: [{ nom: 'L1', status: 'en_revision' }], next_cursor: null },
        errors: [],
      })
    const onDone = vi.fn()
    const onError = vi.fn()
    await pollLotsUntilDone(['L1'], onDone, onError, { intervalMs: 1, maxTries: 5 })
    expect(onDone).toHaveBeenCalledOnce()
    expect(onError).not.toHaveBeenCalled()
  })

  it('appelle onError si un lot passe en erreur', async () => {
    vi.mocked(apiClient.findLots).mockResolvedValueOnce({
      status: 'ok',
      data: { items: [{ nom: 'L1', status: 'erreur' }], next_cursor: null },
      errors: [],
    })
    const onDone = vi.fn()
    const onError = vi.fn()
    await pollLotsUntilDone(['L1'], onDone, onError, { intervalMs: 1, maxTries: 5 })
    expect(onError).toHaveBeenCalledOnce()
    expect(onDone).not.toHaveBeenCalled()
  })
})
