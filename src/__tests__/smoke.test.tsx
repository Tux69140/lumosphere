import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import App from '../App'
import { AuthProvider } from '@/components/AuthProvider'

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
  },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() }, Toaster: () => null }))

describe('Smoke', () => {
  it('affiche le bandeau avec Lumosphère', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('Lumosphère')).toBeInTheDocument())
  })
})
