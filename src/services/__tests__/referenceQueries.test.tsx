import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { createQueryClient } from '@/services/queryClient'
import {
  useOeuvres,
  useAuteurs,
  useThemes,
  useKeywords,
  useEtats,
  useEmojis,
} from '@/services/referenceQueries'

vi.mock('@/services/api', () => ({
  apiClient: {
    findOeuvres: vi.fn().mockResolvedValue({
      status: 'ok',
      data: [{ id: 1, nom: 'ebook' }],
      errors: [],
    }),
    findAuteurs: vi.fn().mockResolvedValue({
      status: 'ok',
      data: [{ id: 2, nom: 'Auteur Test' }],
      errors: [],
    }),
    findThemes: vi.fn().mockResolvedValue({
      status: 'ok',
      data: [{ id: 3, libelle: 'Philosophie' }],
      errors: [],
    }),
    findKeywords: vi.fn().mockResolvedValue({
      status: 'ok',
      data: [{ id: 4, mot: 'éthique' }],
      errors: [],
    }),
    findEtats: vi.fn().mockResolvedValue({
      status: 'ok',
      data: [{ id: 5, libelle: 'À Corriger' }],
      errors: [],
    }),
    findEmojis: vi.fn().mockResolvedValue({
      status: 'ok',
      data: [{ id: 6, code: '📚' }],
      errors: [],
    }),
  },
}))

describe('useOeuvres', () => {
  it('charge les œuvres via apiClient', async () => {
    const client = createQueryClient()
    client.setDefaultOptions({ queries: { retry: false } })
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>
    }
    const { result } = renderHook(() => useOeuvres(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 1, nom: 'ebook' }])
  })
})

describe('useAuteurs', () => {
  it('charge les auteurs via apiClient', async () => {
    const client = createQueryClient()
    client.setDefaultOptions({ queries: { retry: false } })
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>
    }
    const { result } = renderHook(() => useAuteurs(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 2, nom: 'Auteur Test' }])
  })
})

describe('useThemes', () => {
  it('charge les thèmes via apiClient', async () => {
    const client = createQueryClient()
    client.setDefaultOptions({ queries: { retry: false } })
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>
    }
    const { result } = renderHook(() => useThemes(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 3, libelle: 'Philosophie' }])
  })
})

describe('useKeywords', () => {
  it('charge les mots-clés via apiClient', async () => {
    const client = createQueryClient()
    client.setDefaultOptions({ queries: { retry: false } })
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>
    }
    const { result } = renderHook(() => useKeywords(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 4, mot: 'éthique' }])
  })
})

describe('useEtats', () => {
  it('charge les états via apiClient', async () => {
    const client = createQueryClient()
    client.setDefaultOptions({ queries: { retry: false } })
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>
    }
    const { result } = renderHook(() => useEtats(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 5, libelle: 'À Corriger' }])
  })
})

describe('useEmojis', () => {
  it('charge les emojis via apiClient', async () => {
    const client = createQueryClient()
    client.setDefaultOptions({ queries: { retry: false } })
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>
    }
    const { result } = renderHook(() => useEmojis(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 6, code: '📚' }])
  })
})

describe('unwrap — cas erreur', () => {
  it('lève une Error si status === error', async () => {
    const client = createQueryClient()
    client.setDefaultOptions({ queries: { retry: false } })
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>
    }
    const { apiClient } = await import('@/services/api')
    vi.mocked(apiClient.findOeuvres).mockResolvedValueOnce({
      status: 'error',
      data: null,
      errors: ['Accès refusé'],
    })
    const { result } = renderHook(() => useOeuvres(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('Accès refusé')
  })
})
