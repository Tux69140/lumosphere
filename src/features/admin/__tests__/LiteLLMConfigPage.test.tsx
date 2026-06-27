import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LiteLLMConfigPage } from '../LiteLLMConfigPage'

const api = vi.hoisted(() => ({
  aiTestConnection: vi.fn(),
}))
vi.mock('@/services/api', () => ({ apiClient: api }))

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMock }))

beforeEach(() => vi.clearAllMocks())

describe('LiteLLMConfigPage', () => {
  it('rend sans crash', () => {
    render(<LiteLLMConfigPage />)
    expect(screen.getByRole('button', { name: /Tester la connexion/i })).toBeInTheDocument()
    expect(screen.getByText(/litellm_base_url/)).toBeInTheDocument()
  })

  it('affiche le toast succès et le modèle retourné après un test réussi', async () => {
    api.aiTestConnection.mockResolvedValue({
      status: 'ok',
      data: { ok: true, model: 'gpt-4o-mini' },
      errors: [],
    })
    render(<LiteLLMConfigPage />)
    await userEvent.click(screen.getByRole('button', { name: /Tester la connexion/i }))
    await waitFor(() => expect(api.aiTestConnection).toHaveBeenCalledTimes(1))
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining('gpt-4o-mini'))
    expect(await screen.findByText(/Connexion OK/)).toBeInTheDocument()
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument()
  })

  it("affiche le toast erreur en cas d'échec", async () => {
    api.aiTestConnection.mockResolvedValue({
      status: 'error',
      data: null,
      errors: ['Proxy injoignable.'],
    })
    render(<LiteLLMConfigPage />)
    await userEvent.click(screen.getByRole('button', { name: /Tester la connexion/i }))
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Proxy injoignable.'))
    expect(screen.queryByText(/Connexion OK/)).not.toBeInTheDocument()
  })
})
