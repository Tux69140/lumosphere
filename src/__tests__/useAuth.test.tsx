import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/components/AuthProvider'
import { useAuth } from '@/hooks/useAuth'

vi.mock('@/services/api', () => ({
  apiClient: { getMe: vi.fn(), login: vi.fn(), logout: vi.fn(), onSessionExpired: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

import { apiClient } from '@/services/api'

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>
    <AuthProvider>{children}</AuthProvider>
  </MemoryRouter>
)

const ADMIN = {
  id: 1,
  prenom: 'A',
  nom: 'B',
  email: 'a@b.c',
  role_id: 1,
  role_nom: 'Administrateur',
}

beforeEach(() => vi.clearAllMocks())

describe('useAuth', () => {
  it('charge null au montage sans session', async () => {
    vi.mocked(apiClient.getMe).mockResolvedValue({ status: 'ok', data: null, errors: [] })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it('login réussi remplit user et transmet remember', async () => {
    vi.mocked(apiClient.getMe).mockResolvedValueOnce({ status: 'ok', data: null, errors: [] })
    vi.mocked(apiClient.login).mockResolvedValue({
      status: 'ok',
      data: { id: 1 },
      errors: [],
    } as never)
    vi.mocked(apiClient.getMe).mockResolvedValueOnce({
      status: 'ok',
      data: ADMIN,
      errors: [],
    } as never)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    let res: { ok: boolean; error?: string } = { ok: false }
    await act(async () => {
      res = await result.current.login('a@b.c', 'pw', true)
    })
    expect(res.ok).toBe(true)
    expect(apiClient.login).toHaveBeenCalledWith('a@b.c', 'pw', true)
    expect(result.current.user?.role_nom).toBe('Administrateur')
  })

  it('login échoué renvoie une erreur sans connecter', async () => {
    vi.mocked(apiClient.getMe).mockResolvedValue({ status: 'ok', data: null, errors: [] })
    vi.mocked(apiClient.login).mockResolvedValue({
      status: 'error',
      data: null,
      errors: ['Identifiants incorrects.'],
    } as never)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    let res: { ok: boolean; error?: string } = { ok: true }
    await act(async () => {
      res = await result.current.login('a@b.c', 'bad', false)
    })
    expect(res).toEqual({ ok: false, error: 'Identifiants incorrects.' })
    expect(result.current.user).toBeNull()
  })

  it('logout vide user', async () => {
    vi.mocked(apiClient.getMe).mockResolvedValue({ status: 'ok', data: ADMIN, errors: [] } as never)
    vi.mocked(apiClient.logout).mockResolvedValue({ status: 'ok', data: null, errors: [] } as never)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.user).not.toBeNull())
    await act(async () => {
      await result.current.logout()
    })
    expect(result.current.user).toBeNull()
  })
})
