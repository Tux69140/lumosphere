import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router'
import { RequireAuth } from '../RequireAuth'
import { useAuth } from '@/hooks/useAuth'
import type { AuthUser } from '@/hooks/useAuth'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

function renderProtected(state: { user: AuthUser | null; loading: boolean }) {
  vi.mocked(useAuth).mockReturnValue({ ...state, login: vi.fn(), logout: vi.fn() })
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <div>ZONE_ADMIN</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<div>PAGE_LOGIN</div>} />
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

describe('RequireAuth', () => {
  it('chargement : ni zone ni redirection', () => {
    renderProtected({ user: null, loading: true })
    expect(screen.queryByText('ZONE_ADMIN')).not.toBeInTheDocument()
    expect(screen.queryByText('PAGE_LOGIN')).not.toBeInTheDocument()
  })

  it('non connecté : redirige vers /login', () => {
    renderProtected({ user: null, loading: false })
    expect(screen.getByText('PAGE_LOGIN')).toBeInTheDocument()
  })

  it('rôle non autorisé (abonné) : redirige vers /login', () => {
    renderProtected({ user: abo3, loading: false })
    expect(screen.getByText('PAGE_LOGIN')).toBeInTheDocument()
  })

  it('admin : affiche la zone protégée', () => {
    renderProtected({ user: admin, loading: false })
    expect(screen.getByText('ZONE_ADMIN')).toBeInTheDocument()
  })
})
