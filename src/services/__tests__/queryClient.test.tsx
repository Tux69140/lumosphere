import { useQuery } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'

function Probe() {
  const { data } = useQuery({ queryKey: ['probe'], queryFn: async () => 'pong' })
  return <div>{data ?? '…'}</div>
}

describe('socle Query', () => {
  it('useQuery fonctionne dans renderWithClient', async () => {
    renderWithClient(<Probe />)
    await waitFor(() => expect(screen.getByText('pong')).toBeInTheDocument())
  })
})
