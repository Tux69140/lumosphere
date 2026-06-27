import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { AuthProvider } from '@/components/AuthProvider'
import { createQueryClient } from '@/services/queryClient'

vi.mock('@/services/api', () => ({
  apiClient: {
    getMe: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
    login: vi.fn(),
    logout: vi.fn(),
    onSessionExpired: vi.fn(),
    findCitations: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { items: [], next_cursor: null }, errors: [] }),
    findOeuvres: vi.fn().mockResolvedValue({ status: 'ok', data: [], errors: [] }),
    findThemes: vi.fn().mockResolvedValue({ status: 'ok', data: [], errors: [] }),
    findKeywords: vi.fn().mockResolvedValue({ status: 'ok', data: [], errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() }, Toaster: () => null }))

describe('Smoke', () => {
  it('affiche le bandeau avec Lumosphère', async () => {
    const client = createQueryClient()
    client.setDefaultOptions({ queries: { retry: false, staleTime: 0 } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByText('Lumosphère')).toBeInTheDocument())
  })
})
