import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { LoginPage } from '../LoginPage'
import { useAuth } from '@/hooks/useAuth'

const navigate = vi.fn()
vi.mock('react-router', async (orig) => ({
  ...(await orig<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

function setup(login = vi.fn().mockResolvedValue({ ok: true })) {
  vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login, logout: vi.fn() })
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
  return { login }
}

beforeEach(() => vi.clearAllMocks())

describe('LoginPage', () => {
  it('affiche email, mot de passe, se souvenir de moi et le bouton', () => {
    setup()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/se souvenir de moi/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
  })

  it('soumet avec le drapeau « se souvenir de moi » et redirige', async () => {
    const { login } = setup()
    const u = userEvent.setup()
    await u.type(screen.getByLabelText(/email/i), 'a@b.c')
    await u.type(screen.getByLabelText(/mot de passe/i), 'secret')
    await u.click(screen.getByLabelText(/se souvenir de moi/i))
    await u.click(screen.getByRole('button', { name: /se connecter/i }))
    expect(login).toHaveBeenCalledWith('a@b.c', 'secret', true)
    expect(navigate).toHaveBeenCalledWith('/')
  })

  it("affiche le message d'erreur du serveur", async () => {
    setup(vi.fn().mockResolvedValue({ ok: false, error: 'Identifiants incorrects.' }))
    const u = userEvent.setup()
    await u.type(screen.getByLabelText(/email/i), 'a@b.c')
    await u.type(screen.getByLabelText(/mot de passe/i), 'bad')
    await u.click(screen.getByRole('button', { name: /se connecter/i }))
    expect(await screen.findByText('Identifiants incorrects.')).toBeInTheDocument()
  })
})
