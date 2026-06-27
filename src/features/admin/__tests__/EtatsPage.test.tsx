import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'
import { EtatsPage } from '../EtatsPage'

const MOCK_ETATS = vi.hoisted(() => [
  { id: 1, nom: 'À Corriger', code: 'C', couleur: '#ef4444', est_modifiable: 0 },
  { id: 2, nom: 'À Réviser', code: 'R', couleur: '#f59e0b', est_modifiable: 0 },
  { id: 3, nom: 'Publiée', code: 'P', couleur: '#10b981', est_modifiable: 0 },
  { id: 4, nom: 'Archivée', code: 'A', couleur: '#6b7280', est_modifiable: 1 },
])

vi.mock('@/services/api', () => ({
  apiClient: {
    findEtats: vi.fn().mockResolvedValue({ status: 'ok', data: MOCK_ETATS, errors: [] }),
    updateEtat: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 4 }, errors: [] }),
    deleteEtat: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { apiClient } from '@/services/api'

beforeEach(() => vi.clearAllMocks())

describe('EtatsPage', () => {
  it('affiche tous les états au chargement', async () => {
    renderWithClient(<EtatsPage />)
    await waitFor(() => expect(screen.getByText('À Corriger')).toBeInTheDocument())
    expect(screen.getByText('À Réviser')).toBeInTheDocument()
    expect(screen.getByText('Publiée')).toBeInTheDocument()
    expect(screen.getByText('Archivée')).toBeInTheDocument()
  })

  it('affiche le badge Système pour les états non modifiables', async () => {
    renderWithClient(<EtatsPage />)
    await waitFor(() => screen.getByText('À Corriger'))
    const badgesSystème = screen.getAllByText('Système')
    expect(badgesSystème).toHaveLength(3)
  })

  it('affiche le bouton Modifier pour les états modifiables', async () => {
    renderWithClient(<EtatsPage />)
    await waitFor(() => screen.getByText('Archivée'))
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument()
  })

  it("ouvre le formulaire d'édition au clic sur Modifier", async () => {
    renderWithClient(<EtatsPage />)
    await waitFor(() => screen.getByRole('button', { name: 'Modifier' }))
    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }))
    expect((screen.getByLabelText("Nom de l'état") as HTMLInputElement).value).toBe('Archivée')
  })

  it('appelle updateEtat avec les bonnes données', async () => {
    renderWithClient(<EtatsPage />)
    await waitFor(() => screen.getByRole('button', { name: 'Modifier' }))
    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }))
    const input = screen.getByLabelText("Nom de l'état") as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, 'Archive')
    await userEvent.click(screen.getByRole('button', { name: 'OK' }))
    await waitFor(() =>
      expect(apiClient.updateEtat).toHaveBeenCalledWith(
        4,
        expect.objectContaining({ nom: 'Archive' }),
      ),
    )
  })

  it("annule l'édition au clic sur Annuler", async () => {
    renderWithClient(<EtatsPage />)
    await waitFor(() => screen.getByRole('button', { name: 'Modifier' }))
    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }))
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByLabelText("Nom de l'état")).not.toBeInTheDocument()
  })
})
