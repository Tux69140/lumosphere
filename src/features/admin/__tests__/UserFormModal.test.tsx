import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserFormModal } from '../UserFormModal'

const { createUser, updateUser, resendInvite } = vi.hoisted(() => ({
  createUser: vi.fn(),
  updateUser: vi.fn(),
  resendInvite: vi.fn(),
}))
vi.mock('@/services/api', () => ({ apiClient: { createUser, updateUser, resendInvite } }))

const roles = [
  { id: 1, nom: 'Administrateur' },
  { id: 4, nom: 'Abo3' },
]

beforeEach(() => vi.clearAllMocks())

describe('UserFormModal', () => {
  it("n'affiche pas de champ mot de passe et prévient de l'envoi de l'invitation à la création", () => {
    render(<UserFormModal open user={null} roles={roles} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByLabelText(/mot de passe/i)).not.toBeInTheDocument()
    expect(
      screen.getByText(/un email d'invitation sera envoyé automatiquement/i),
    ).toBeInTheDocument()
  })

  it('crée un utilisateur sans mot de passe et notifie le succès', async () => {
    createUser.mockResolvedValue({ status: 'ok', data: { id: 1 }, errors: [] })
    const onSaved = vi.fn()
    render(<UserFormModal open user={null} roles={roles} onClose={vi.fn()} onSaved={onSaved} />)
    await userEvent.type(screen.getByLabelText('Prénom'), 'Jean')
    await userEvent.type(screen.getByLabelText('Nom'), 'Test')
    await userEvent.type(screen.getByLabelText('Email'), 'jean@test.fr')
    await userEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
    await waitFor(() =>
      expect(createUser).toHaveBeenCalledWith({
        prenom: 'Jean',
        nom: 'Test',
        email: 'jean@test.fr',
        role_id: 1,
      }),
    )
    expect(onSaved).toHaveBeenCalled()
  })

  it('affiche « En attente » et un bouton de renvoi pour un compte non activé', async () => {
    const user = {
      id: 2,
      prenom: 'Ada',
      nom: 'Lovelace',
      email: 'ada@test.fr',
      role_id: 1,
      is_activated: false,
    }
    resendInvite.mockResolvedValue({ status: 'ok', data: { message: 'ok' }, errors: [] })
    render(<UserFormModal open user={user} roles={roles} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('En attente')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /renvoyer l'invitation/i }))
    await waitFor(() => expect(resendInvite).toHaveBeenCalledWith(2))
    expect(await screen.findByText('Invitation envoyée !')).toBeInTheDocument()
  })

  it('affiche « Actif » sans bouton de renvoi pour un compte déjà activé', () => {
    const user = {
      id: 3,
      prenom: 'Ada',
      nom: 'Lovelace',
      email: 'ada@test.fr',
      role_id: 1,
      is_activated: true,
    }
    render(<UserFormModal open user={user} roles={roles} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('Actif')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /renvoyer l'invitation/i })).not.toBeInTheDocument()
  })
})
