import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { SetPasswordPage } from '../SetPasswordPage'

const { mockCheck } = vi.hoisted(() => ({ mockCheck: vi.fn() }))
vi.mock('@zxcvbn-ts/core', () => ({
  ZxcvbnFactory: class {
    check(pwd: string) {
      return mockCheck(pwd)
    }
  },
}))

const { tokenInfo, setPassword } = vi.hoisted(() => ({
  tokenInfo: vi.fn(),
  setPassword: vi.fn(),
}))
vi.mock('@/services/api', () => ({ apiClient: { tokenInfo, setPassword } }))

const navigate = vi.fn()
vi.mock('react-router', async (orig) => ({
  ...(await orig<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

function renderPage(search = '?token=abc123') {
  return render(
    <MemoryRouter initialEntries={[`/definir-mot-de-passe${search}`]}>
      <SetPasswordPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCheck.mockImplementation((pwd: string) => ({ score: pwd.length >= 12 ? 4 : 0 }))
})

describe('SetPasswordPage', () => {
  it('affiche « Lien invalide. » sans jeton', () => {
    renderPage('')
    expect(screen.getByText('Lien invalide.')).toBeInTheDocument()
  })

  it('affiche la carte des conditions adaptée au rôle Administrateur', async () => {
    tokenInfo.mockResolvedValue({
      status: 'ok',
      data: {
        role_id: 1,
        type: 'invite',
        prenom: 'Ada',
        nom: 'Lovelace',
        email: 'ada@test.com',
        role_nom: 'Administrateur',
      },
      errors: [],
    })
    renderPage()
    expect(
      await screen.findByText(/Compte Administrateur — sécurité renforcée/),
    ).toBeInTheDocument()
  })

  it('désactive le bouton jusqu’à ce que les 4 conditions et la confirmation soient réunies, puis soumet', async () => {
    tokenInfo.mockResolvedValue({
      status: 'ok',
      data: {
        role_id: 1,
        type: 'invite',
        prenom: 'Ada',
        nom: 'Lovelace',
        email: 'ada@test.com',
        role_nom: 'Administrateur',
      },
      errors: [],
    })
    setPassword.mockResolvedValue({ status: 'ok', data: { message: 'ok' }, errors: [] })
    renderPage()
    await screen.findByText(/Compte Administrateur/)

    const u = userEvent.setup()
    const submit = screen.getByRole('button', { name: /définir mon mot de passe/i })
    expect(submit).toBeDisabled()

    await u.type(screen.getByLabelText('Mot de passe'), 'Pluie&Soleil99!Xy')
    await u.type(screen.getByLabelText('Confirmation'), 'Pluie&Soleil99!Xy')

    await waitFor(() => expect(submit).toBeEnabled())
    await u.click(submit)

    expect(setPassword).toHaveBeenCalledWith('abc123', 'Pluie&Soleil99!Xy')
    expect(await screen.findByText('Mot de passe défini avec succès !')).toBeInTheDocument()
  })
})
