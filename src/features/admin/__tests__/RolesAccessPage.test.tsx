// src/features/admin/__tests__/RolesAccessPage.test.tsx

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RolesAccessPage } from '../RolesAccessPage'

const MOCK_ROLES = vi.hoisted(() => [
  { id: 1, nom: 'Administrateur' },
  { id: 2, nom: 'Éditeur' },
  { id: 3, nom: 'Visiteur' },
])

vi.mock('@/services/api', () => ({
  apiClient: {
    findRoles: vi.fn().mockResolvedValue({ status: 'ok', data: MOCK_ROLES, errors: [] }),
    findOeuvres: vi.fn().mockResolvedValue({
      status: 'ok',
      data: [{ id: 1, nom: 'Œuvre A', auteur_nom: 'X' }],
      errors: [],
    }),
    getRoleWithPermissions: vi.fn().mockResolvedValue({
      status: 'ok',
      data: {
        id: 2,
        nom: 'Éditeur',
        permissions: [
          { id: 1, code: 'corpus.read' },
          { id: 2, code: 'corpus.read_all' },
        ],
      },
      errors: [],
    }),
    getRoleOeuvres: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { oeuvre_ids: [1] }, errors: [] }),
    createRole: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { id: 6, nom: 'Mon Rôle' }, errors: [] }),
    updateRole: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { id: 2, nom: 'Éditeur' }, errors: [] }),
    updateRolePermissions: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
    setRoleOeuvres: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { oeuvre_ids: [] }, errors: [] }),
    deleteRole: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { apiClient } from '@/services/api'

beforeEach(() => vi.clearAllMocks())

describe('RolesAccessPage', () => {
  it('affiche la liste des rôles au chargement', async () => {
    render(<RolesAccessPage />)
    await waitFor(() => expect(screen.getByText('Administrateur')).toBeInTheDocument())
    expect(screen.getByText('Éditeur')).toBeInTheDocument()
    expect(screen.getByText('Visiteur')).toBeInTheDocument()
  })

  it('charge la fiche du rôle au clic', async () => {
    render(<RolesAccessPage />)
    await waitFor(() => screen.getByTestId('role-item-2'))
    await userEvent.click(screen.getByTestId('role-item-2'))
    await waitFor(() => expect(apiClient.getRoleWithPermissions).toHaveBeenCalledWith(2))
  })

  it('ouvre une fiche vierge au clic sur le bouton Créer', async () => {
    render(<RolesAccessPage />)
    await waitFor(() => screen.getByLabelText('Créer un nouveau rôle'))
    await userEvent.click(screen.getByLabelText('Créer un nouveau rôle'))
    await waitFor(() =>
      expect((screen.getByPlaceholderText('Ex : Abonnés Premium') as HTMLInputElement).value).toBe(
        '',
      ),
    )
  })

  it("appelle createRole lors de l'enregistrement d'un nouveau rôle", async () => {
    render(<RolesAccessPage />)
    await waitFor(() => screen.getByLabelText('Créer un nouveau rôle'))
    await userEvent.click(screen.getByLabelText('Créer un nouveau rôle'))
    await userEvent.type(screen.getByPlaceholderText('Ex : Abonnés Premium'), 'Mon Rôle')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() =>
      expect(apiClient.createRole).toHaveBeenCalledWith('Mon Rôle', expect.any(Array)),
    )
  })

  it('Admin sélectionné : champ nom désactivé', async () => {
    vi.mocked(apiClient.getRoleWithPermissions).mockResolvedValueOnce({
      status: 'ok',
      data: { id: 1, nom: 'Administrateur', permissions: [{ id: 1, code: 'corpus.read' }] },
      errors: [],
    })
    vi.mocked(apiClient.getRoleOeuvres).mockResolvedValueOnce({
      status: 'ok',
      data: { oeuvre_ids: [] },
      errors: [],
    })
    render(<RolesAccessPage />)
    await waitFor(() => screen.getByTestId('role-item-1'))
    await userEvent.click(screen.getByTestId('role-item-1'))
    await waitFor(() => screen.getByDisplayValue('Administrateur'))
    expect((screen.getByLabelText('Nom du rôle') as HTMLInputElement).disabled).toBe(true)
  })

  it('suppression : appelle deleteRole après confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    vi.mocked(apiClient.getRoleWithPermissions).mockResolvedValueOnce({
      status: 'ok',
      data: { id: 2, nom: 'Éditeur', permissions: [{ id: 1, code: 'corpus.read' }] },
      errors: [],
    })
    vi.mocked(apiClient.getRoleOeuvres).mockResolvedValueOnce({
      status: 'ok',
      data: { oeuvre_ids: [] },
      errors: [],
    })
    render(<RolesAccessPage />)
    await waitFor(() => screen.getByTestId('role-item-2'))
    await userEvent.click(screen.getByTestId('role-item-2'))
    await waitFor(() => screen.getByRole('button', { name: /supprimer ce rôle/i }))
    await userEvent.click(screen.getByRole('button', { name: /supprimer ce rôle/i }))
    await waitFor(() => expect(apiClient.deleteRole).toHaveBeenCalledWith(2))
  })
})
