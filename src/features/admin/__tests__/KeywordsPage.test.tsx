import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'
import { KeywordsPage } from '../KeywordsPage'

const MOCK_KEYWORDS = vi.hoisted(() => [
  { id: 1, mot: 'philosophie' },
  { id: 2, mot: 'éthique' },
  { id: 3, mot: 'littérature' },
])

vi.mock('@/services/api', () => ({
  apiClient: {
    findKeywords: vi.fn().mockResolvedValue({ status: 'ok', data: MOCK_KEYWORDS, errors: [] }),
    createKeyword: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 4 }, errors: [] }),
    deleteKeyword: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { apiClient } from '@/services/api'

beforeEach(() => vi.clearAllMocks())

describe('KeywordsPage', () => {
  it('affiche la liste des mots-clés au chargement', async () => {
    renderWithClient(<KeywordsPage />)
    await waitFor(() => expect(screen.getByText('philosophie')).toBeInTheDocument())
    expect(screen.getByText('éthique')).toBeInTheDocument()
    expect(screen.getByText('littérature')).toBeInTheDocument()
  })

  it('filtre les mots-clés selon la recherche', async () => {
    renderWithClient(<KeywordsPage />)
    await waitFor(() => screen.getByText('philosophie'))
    await userEvent.type(screen.getByLabelText('Rechercher des mots-clés'), 'éth')
    expect(screen.getByText('éthique')).toBeInTheDocument()
    expect(screen.queryByText('philosophie')).not.toBeInTheDocument()
  })

  it('appelle createKeyword avec le bon mot', async () => {
    renderWithClient(<KeywordsPage />)
    await waitFor(() => screen.getByLabelText('Nouveau mot-clé'))
    await userEvent.type(screen.getByLabelText('Nouveau mot-clé'), 'poésie')
    await userEvent.click(screen.getByRole('button', { name: /ajouter/i }))
    await waitFor(() => expect(apiClient.createKeyword).toHaveBeenCalledWith({ mot: 'poésie' }))
  })

  it('appelle deleteKeyword après confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    renderWithClient(<KeywordsPage />)
    await waitFor(() => screen.getByLabelText('Supprimer philosophie'))
    await userEvent.click(screen.getByLabelText('Supprimer philosophie'))
    await waitFor(() => expect(apiClient.deleteKeyword).toHaveBeenCalledWith(1))
  })

  it('affiche le compteur de mots-clés', async () => {
    renderWithClient(<KeywordsPage />)
    await waitFor(() => screen.getByText('philosophie'))
    expect(screen.getByText(/3 mots-clés/)).toBeInTheDocument()
  })
})
