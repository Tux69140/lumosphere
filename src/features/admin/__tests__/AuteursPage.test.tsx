import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'
import { AuteursPage } from '../AuteursPage'

const MOCK_AUTEURS = vi.hoisted(() => [
  { id: 1, nom: 'Simone de Beauvoir', site: null, informations: null },
  { id: 2, nom: 'Albert Camus', site: 'https://camus.fr', informations: 'Auteur algérien' },
])

vi.mock('@/services/api', () => ({
  apiClient: {
    findAuteurs: vi.fn().mockResolvedValue({ status: 'ok', data: MOCK_AUTEURS, errors: [] }),
    createAuteur: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 3 }, errors: [] }),
    updateAuteur: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 1 }, errors: [] }),
    deleteAuteur: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { apiClient } from '@/services/api'

beforeEach(() => vi.clearAllMocks())

describe('AuteursPage', () => {
  it('affiche la liste des auteurs au chargement', async () => {
    renderWithClient(<AuteursPage />)
    await waitFor(() => expect(screen.getByText('Simone de Beauvoir')).toBeInTheDocument())
    expect(screen.getByText('Albert Camus')).toBeInTheDocument()
  })

  it('affiche le panneau de détail en cliquant sur un auteur', async () => {
    renderWithClient(<AuteursPage />)
    await waitFor(() => screen.getByTestId('auteur-item-2'))
    await userEvent.click(screen.getByTestId('auteur-item-2'))
    expect((screen.getByLabelText("Nom de l'auteur") as HTMLInputElement).value).toBe(
      'Albert Camus',
    )
    expect((screen.getByLabelText("Site web de l'auteur") as HTMLInputElement).value).toBe(
      'https://camus.fr',
    )
  })

  it('ouvre un formulaire vide en cliquant sur Créer', async () => {
    renderWithClient(<AuteursPage />)
    await waitFor(() => screen.getByLabelText('Créer un nouvel auteur'))
    await userEvent.click(screen.getByLabelText('Créer un nouvel auteur'))
    expect((screen.getByLabelText("Nom de l'auteur") as HTMLInputElement).value).toBe('')
  })

  it('affiche une erreur si le nom est vide à la soumission', async () => {
    renderWithClient(<AuteursPage />)
    await waitFor(() => screen.getByLabelText('Créer un nouvel auteur'))
    await userEvent.click(screen.getByLabelText('Créer un nouvel auteur'))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(screen.getByText('Le nom est requis.')).toBeInTheDocument()
    expect(apiClient.createAuteur).not.toHaveBeenCalled()
  })

  it('appelle createAuteur avec les bonnes données', async () => {
    renderWithClient(<AuteursPage />)
    await waitFor(() => screen.getByLabelText('Créer un nouvel auteur'))
    await userEvent.click(screen.getByLabelText('Créer un nouvel auteur'))
    await userEvent.type(screen.getByLabelText("Nom de l'auteur"), 'Victor Hugo')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() =>
      expect(apiClient.createAuteur).toHaveBeenCalledWith(
        expect.objectContaining({ nom: 'Victor Hugo' }),
      ),
    )
  })

  it('appelle updateAuteur lors de la modification', async () => {
    renderWithClient(<AuteursPage />)
    await waitFor(() => screen.getByTestId('auteur-item-1'))
    await userEvent.click(screen.getByTestId('auteur-item-1'))
    const input = screen.getByLabelText("Nom de l'auteur") as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, 'S. de Beauvoir')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() =>
      expect(apiClient.updateAuteur).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ nom: 'S. de Beauvoir' }),
      ),
    )
  })

  it('appelle deleteAuteur après confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    renderWithClient(<AuteursPage />)
    await waitFor(() => screen.getByTestId('auteur-item-1'))
    await userEvent.click(screen.getByTestId('auteur-item-1'))
    await waitFor(() => screen.getByRole('button', { name: /supprimer/i }))
    await userEvent.click(screen.getByRole('button', { name: /supprimer/i }))
    await waitFor(() => expect(apiClient.deleteAuteur).toHaveBeenCalledWith(1))
  })
})
