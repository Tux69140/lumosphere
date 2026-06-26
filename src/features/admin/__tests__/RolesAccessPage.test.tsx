import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RolesAccessPage } from '../RolesAccessPage'

vi.mock('@/services/api', () => ({
  apiClient: {
    findOeuvres: vi.fn().mockResolvedValue({
      status: 'ok',
      data: [
        { id: 1, nom: 'Œuvre A', auteur_nom: 'X' },
        { id: 2, nom: 'Œuvre B', auteur_nom: 'Y' },
      ],
      errors: [],
    }),
    getRoleOeuvres: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { oeuvre_ids: [1] }, errors: [] }),
    setRoleOeuvres: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { oeuvre_ids: [] }, errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { apiClient } from '@/services/api'

beforeEach(() => vi.clearAllMocks())

describe('RolesAccessPage', () => {
  it("coche l'état initial et enregistre les œuvres réservées d'Abo3", async () => {
    render(<RolesAccessPage />)
    const abo3Panel = screen.getByTestId('panel-abo3')
    await waitFor(() => expect(within(abo3Panel).getByLabelText('Œuvre A')).toBeChecked())
    // Réserver aussi l'œuvre B dans le panneau Abo3 puis enregistrer.
    await userEvent.click(within(abo3Panel).getByLabelText('Œuvre B'))
    await userEvent.click(within(abo3Panel).getByRole('button', { name: /enregistrer abo3/i }))
    await waitFor(() =>
      expect(apiClient.setRoleOeuvres).toHaveBeenCalledWith(4, expect.arrayContaining([1, 2])),
    )
  })
})
