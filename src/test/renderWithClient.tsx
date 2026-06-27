import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/services/queryClient'

// Un client neuf par rendu : pas de cache partagé entre tests ; pas de retry (échecs immédiats).
export function renderWithClient(ui: ReactElement) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, staleTime: 0 } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  return { client, ...render(ui, { wrapper: Wrapper }) }
}
