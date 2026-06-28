import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { createQueryClient } from '@/services/queryClient'

export function renderWithClient(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, staleTime: 0 } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </MemoryRouter>
    )
  }
  return { client, ...render(ui, { wrapper: Wrapper }) }
}
