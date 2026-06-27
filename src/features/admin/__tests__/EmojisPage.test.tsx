import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'
import { EmojisPage } from '../EmojisPage'

const MOCK_EMOJIS = vi.hoisted(() => [
  { id: 1, code: '🌟' },
  { id: 2, code: '🔥' },
])

vi.mock('@/services/api', () => ({
  apiClient: {
    findEmojis: vi.fn().mockResolvedValue({ status: 'ok', data: MOCK_EMOJIS, errors: [] }),
    createEmoji: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 3 }, errors: [] }),
    deleteEmoji: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { apiClient } from '@/services/api'

beforeEach(() => vi.clearAllMocks())

describe('EmojisPage', () => {
  it('affiche la liste des emojis au chargement', async () => {
    renderWithClient(<EmojisPage />)
    await waitFor(() => expect(screen.getByText('🌟')).toBeInTheDocument())
    expect(screen.getByText('🔥')).toBeInTheDocument()
  })

  it("affiche le compteur d'emojis", async () => {
    renderWithClient(<EmojisPage />)
    await waitFor(() => screen.getByText('🌟'))
    expect(screen.getByText('2 emojis')).toBeInTheDocument()
  })

  it('appelle createEmoji avec le bon code', async () => {
    renderWithClient(<EmojisPage />)
    await waitFor(() => screen.getByLabelText('Code emoji'))
    await userEvent.type(screen.getByLabelText('Code emoji'), '💎')
    await userEvent.click(screen.getByRole('button', { name: /ajouter/i }))
    await waitFor(() => expect(apiClient.createEmoji).toHaveBeenCalledWith({ code: '💎' }))
  })

  it('appelle deleteEmoji après confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    renderWithClient(<EmojisPage />)
    await waitFor(() => screen.getByLabelText('Supprimer 🌟'))
    await userEvent.click(screen.getByLabelText('Supprimer 🌟'))
    await waitFor(() => expect(apiClient.deleteEmoji).toHaveBeenCalledWith(1))
  })

  it("n'appelle pas deleteEmoji si l'utilisateur annule", async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    renderWithClient(<EmojisPage />)
    await waitFor(() => screen.getByLabelText('Supprimer 🌟'))
    await userEvent.click(screen.getByLabelText('Supprimer 🌟'))
    expect(apiClient.deleteEmoji).not.toHaveBeenCalled()
  })
})
