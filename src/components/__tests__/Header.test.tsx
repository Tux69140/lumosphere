import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Header } from '../Header'
import { useAuth } from '@/hooks/useAuth'
import type { AuthUser } from '@/hooks/useAuth'
import { renderWithClient } from '@/test/renderWithClient'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../ThemeToggle', () => ({ ThemeToggle: () => null }))

function renderHeader(user: AuthUser | null) {
  vi.mocked(useAuth).mockReturnValue({ user, loading: false, login: vi.fn(), logout: vi.fn() })
  renderWithClient(<Header />)
}

const editeur: AuthUser = {
  id: 2,
  prenom: 'E',
  nom: 'D',
  email: 'e@d.c',
  role_id: 2,
  role_nom: 'Éditeur',
}
const abo3: AuthUser = {
  id: 9,
  prenom: 'A',
  nom: 'B',
  email: 'a@b.c',
  role_id: 4,
  role_nom: 'Abo3',
}

beforeEach(() => vi.clearAllMocks())

describe('Header', () => {
  it('non connecté : Connexion visible, pas Déconnexion', () => {
    renderHeader(null)
    expect(screen.getByRole('link', { name: /connexion/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /déconnexion/i })).not.toBeInTheDocument()
  })

  it('éditeur : Déconnexion mais pas de lien Admin', () => {
    renderHeader(editeur)
    expect(screen.getByRole('button', { name: /déconnexion/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument()
  })

  it('admin : Déconnexion + lien Admin', () => {
    renderHeader({
      id: 1,
      prenom: 'A',
      nom: 'D',
      email: 'a@d.c',
      role_id: 1,
      role_nom: 'Administrateur',
    })
    expect(screen.getByRole('button', { name: /déconnexion/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument()
  })

  it('abonné : Déconnexion mais pas de lien Admin', () => {
    renderHeader(abo3)
    expect(screen.getByRole('button', { name: /déconnexion/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument()
  })
})
