import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router'
import { RequireRole } from '../RequireRole'
import { ROLE_ADMIN } from '@/constants/roles'
import { useAuth } from '@/hooks/useAuth'
import type { AuthUser } from '@/hooks/useAuth'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

function renderProtected(state: { user: AuthUser | null; loading: boolean }) {
  vi.mocked(useAuth).mockReturnValue({ ...state, login: vi.fn(), logout: vi.fn() })
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<RequireRole roles={[ROLE_ADMIN]} />}>
          <Route index element={<div>ZONE_ADMIN</div>} />
        </Route>
        <Route path="/login" element={<div>PAGE_LOGIN</div>} />
        <Route path="/" element={<div>PAGE_ACCUEIL</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const admin: AuthUser = {
  id: 1,
  prenom: 'A',
  nom: 'B',
  email: 'a@b.c',
  role_id: 1,
  role_nom: 'Administrateur',
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

describe('RequireRole', () => {
  it('chargement : affiche un indicateur, ni zone ni redirection', () => {
    renderProtected({ user: null, loading: true })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('ZONE_ADMIN')).not.toBeInTheDocument()
    expect(screen.queryByText('PAGE_LOGIN')).not.toBeInTheDocument()
  })

  it('non connecté : redirige vers /login', () => {
    renderProtected({ user: null, loading: false })
    expect(screen.getByText('PAGE_LOGIN')).toBeInTheDocument()
  })

  it('connecté mais rôle insuffisant (abonné) : redirige vers l’accueil', () => {
    renderProtected({ user: abo3, loading: false })
    expect(screen.getByText('PAGE_ACCUEIL')).toBeInTheDocument()
    expect(screen.queryByText('PAGE_LOGIN')).not.toBeInTheDocument()
  })

  it('rôle autorisé (admin) : affiche la zone protégée', () => {
    renderProtected({ user: admin, loading: false })
    expect(screen.getByText('ZONE_ADMIN')).toBeInTheDocument()
  })
})
