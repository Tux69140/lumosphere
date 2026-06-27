import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'
import { OeuvresPage } from '../OeuvresPage'

const OEUVRES = vi.hoisted(() => [
  {
    id: 1,
    nom: 'ebook',
    auteur_id: 5,
    auteur_nom: 'Lulumineuse',
    abreviation: null,
    url: null,
    ref_libraire: null,
    description: null,
  },
])
const AUTEURS = vi.hoisted(() => [{ id: 5, nom: 'Lulumineuse' }])

vi.mock('@/services/api', () => ({
  apiClient: {
    findOeuvres: vi.fn().mockResolvedValue({ status: 'ok', data: OEUVRES, errors: [] }),
    findAuteurs: vi.fn().mockResolvedValue({ status: 'ok', data: AUTEURS, errors: [] }),
    createOeuvre: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 2 }, errors: [] }),
    updateOeuvre: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 1 }, errors: [] }),
    deleteOeuvre: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { apiClient } from '@/services/api'
beforeEach(() => vi.clearAllMocks())

describe('OeuvresPage', () => {
  it('affiche les œuvres au chargement', async () => {
    renderWithClient(<OeuvresPage />)
    await waitFor(() => expect(screen.getByText('ebook')).toBeInTheDocument())
  })

  it('appelle createOeuvre avec les bonnes données', async () => {
    renderWithClient(<OeuvresPage />)
    await waitFor(() => screen.getByLabelText('Créer une nouvelle œuvre'))
    await userEvent.click(screen.getByLabelText('Créer une nouvelle œuvre'))
    await userEvent.type(screen.getByLabelText("Titre de l'œuvre"), 'Articles')
    await userEvent.selectOptions(screen.getByLabelText("Auteur de l'œuvre"), '5')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() =>
      expect(apiClient.createOeuvre).toHaveBeenCalledWith(
        expect.objectContaining({ nom: 'Articles', auteur_id: 5 }),
      ),
    )
  })

  it('appelle deleteOeuvre après confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    renderWithClient(<OeuvresPage />)
    await waitFor(() => screen.getByTestId('oeuvre-item-1'))
    await userEvent.click(screen.getByTestId('oeuvre-item-1'))
    await userEvent.click(screen.getByRole('button', { name: /supprimer/i }))
    await waitFor(() => expect(apiClient.deleteOeuvre).toHaveBeenCalledWith(1))
  })
})
