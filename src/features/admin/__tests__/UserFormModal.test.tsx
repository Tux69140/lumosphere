import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { UserFormModal } from '../UserFormModal'

const roles = [
  { id: 1, nom: 'Administrateur' },
  { id: 4, nom: 'Abo3' },
]

describe('UserFormModal', () => {
  it('refuse un mot de passe trop court et signale la confirmation', async () => {
    const onSaved = vi.fn()
    render(<UserFormModal open user={null} roles={roles} onClose={vi.fn()} onSaved={onSaved} />)
    await userEvent.type(screen.getByLabelText('Prénom'), 'Jean')
    await userEvent.type(screen.getByLabelText('Nom'), 'Test')
    await userEvent.type(screen.getByLabelText('Email'), 'jean@test.fr')
    await userEvent.type(screen.getByLabelText('Mot de passe'), '123')
    await userEvent.type(screen.getByLabelText('Confirmation'), '123')
    await userEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
    expect(screen.getByText(/au moins 8 caractères/i)).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })
})
