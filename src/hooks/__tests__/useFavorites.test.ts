import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFindFavorites, mockAddFavorite, mockRemoveFavorite } = vi.hoisted(() => ({
  mockFindFavorites: vi.fn(),
  mockAddFavorite: vi.fn(),
  mockRemoveFavorite: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  apiClient: {
    findFavorites: mockFindFavorites,
    addFavorite: mockAddFavorite,
    removeFavorite: mockRemoveFavorite,
  },
}))

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }))

vi.mock('@/hooks/useAuth', () => ({ useAuth: mockUseAuth }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

import { useFavorites } from '@/hooks/useFavorites'
import type { AuthUser } from '@/hooks/useAuth'

const LS_KEY = 'lum_favorites'

const adminUser: AuthUser = {
  id: 1,
  prenom: 'A',
  nom: 'B',
  email: 'a@b.c',
  role_id: 1,
  role_nom: 'Administrateur',
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('useFavorites — utilisateur serveur (admin)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: adminUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('charge les favoris depuis le serveur au montage', async () => {
    mockFindFavorites.mockResolvedValue({
      status: 'ok',
      data: { items: [{ citation_id: 10 }, { citation_id: 20 }], next_cursor: null },
      errors: [],
    })
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.favoriteIds).toEqual(new Set([10, 20]))
  })

  it('toggle ajoute un favori via API', async () => {
    mockFindFavorites.mockResolvedValue({
      status: 'ok',
      data: { items: [], next_cursor: null },
      errors: [],
    })
    mockAddFavorite.mockResolvedValue({ status: 'ok', data: null, errors: [] })
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      result.current.toggle(42)
    })
    expect(result.current.favoriteIds.has(42)).toBe(true)
    expect(mockAddFavorite).toHaveBeenCalledWith(42)
  })

  it('toggle retire un favori via API', async () => {
    mockFindFavorites.mockResolvedValue({
      status: 'ok',
      data: { items: [{ citation_id: 42 }], next_cursor: null },
      errors: [],
    })
    mockRemoveFavorite.mockResolvedValue({ status: 'ok', data: null, errors: [] })
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      result.current.toggle(42)
    })
    expect(result.current.favoriteIds.has(42)).toBe(false)
    expect(mockRemoveFavorite).toHaveBeenCalledWith(42)
  })

  it("rollback optimiste si l'API échoue", async () => {
    mockFindFavorites.mockResolvedValue({
      status: 'ok',
      data: { items: [], next_cursor: null },
      errors: [],
    })
    mockAddFavorite.mockResolvedValue({ status: 'error', data: null, errors: ['Erreur'] })
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      result.current.toggle(99)
    })
    await waitFor(() => expect(result.current.favoriteIds.has(99)).toBe(false))
  })
})

describe('useFavorites — utilisateur anonyme (localStorage)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, login: vi.fn(), logout: vi.fn() })
    mockFindFavorites.mockResolvedValue({
      status: 'ok',
      data: { items: [], next_cursor: null },
      errors: [],
    })
  })

  it('charge les favoris depuis localStorage au montage', async () => {
    localStorage.setItem(LS_KEY, JSON.stringify([5, 7]))
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.favoriteIds).toEqual(new Set([5, 7]))
  })

  it('toggle ajoute dans localStorage sans appel API', async () => {
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      result.current.toggle(11)
    })
    expect(result.current.favoriteIds.has(11)).toBe(true)
    const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
    expect(stored).toContain(11)
    expect(mockAddFavorite).not.toHaveBeenCalled()
  })

  it('toggle retire depuis localStorage sans appel API', async () => {
    localStorage.setItem(LS_KEY, JSON.stringify([11]))
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      result.current.toggle(11)
    })
    expect(result.current.favoriteIds.has(11)).toBe(false)
    const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
    expect(stored).not.toContain(11)
    expect(mockRemoveFavorite).not.toHaveBeenCalled()
  })
})
