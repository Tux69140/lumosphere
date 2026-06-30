import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'
import { LiteLLMConfigPage } from '../LiteLLMConfigPage'

const api = vi.hoisted(() => ({
  aiGetSettings: vi.fn().mockResolvedValue({
    status: 'ok',
    data: {
      provider: 'mistral',
      model: 'mistral-small-latest',
      timeout_seconds: 45,
      max_retries: 2,
      catalog: [
        {
          key: 'mistral',
          label: 'Mistral AI',
          base_url: 'https://api.mistral.ai/v1',
          models: ['mistral-small-latest', 'mistral-large-latest'],
          default: 'mistral-small-latest',
          configured: true,
        },
      ],
    },
    errors: [],
  }),
  aiSaveSettings: vi.fn(),
  aiTestConnection: vi.fn(),
  aiGetPrompts: vi.fn().mockResolvedValue({ status: 'ok', data: [], errors: [] }),
  aiUpdatePrompt: vi.fn(),
  aiGetLogs: vi.fn().mockResolvedValue({
    status: 'ok',
    data: { items: [], next_cursor: null },
    errors: [],
  }),
  aiGetRegistry: vi.fn().mockResolvedValue({
    status: 'ok',
    data: { providers: {}, last_refreshed_at: null },
    errors: [],
  }),
  aiUsageSummary: vi.fn().mockResolvedValue({
    status: 'ok',
    data: { total_usd: 0, by_provider: {} },
    errors: [],
  }),
  aiRefreshModels: vi.fn(),
  aiToggleModel: vi.fn(),
  aiOverrideModel: vi.fn(),
}))
vi.mock('@/services/api', () => ({ apiClient: api }))

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMock }))

const REGISTRY_TWO_PROVIDERS = {
  status: 'ok',
  data: {
    last_refreshed_at: null,
    providers: {
      mistral: [
        {
          model_id: 'mistral-small-latest',
          label: 'mistral-small-latest',
          enabled: true,
          deprecated: false,
          pricing_input_per_million_usd: 0.1,
          pricing_output_per_million_usd: 0.3,
          pricing_source: 'community',
          context_window: 32000,
          supports_json: true,
          supports_vision: false,
          notes: null,
          usable: true,
        },
      ],
      openai: [
        {
          model_id: 'gpt-4o-mini',
          label: 'gpt-4o-mini',
          enabled: true,
          deprecated: false,
          pricing_input_per_million_usd: 0.15,
          pricing_output_per_million_usd: 0.6,
          pricing_source: 'community',
          context_window: 128000,
          supports_json: true,
          supports_vision: true,
          notes: null,
          usable: true,
        },
      ],
    },
  },
  errors: [],
}

beforeEach(() => vi.clearAllMocks())

describe('LiteLLMConfigPage', () => {
  it('rend les 4 onglets', async () => {
    renderWithClient(<LiteLLMConfigPage />)
    expect(screen.getByText('Configuration')).toBeInTheDocument()
    expect(screen.getByText('Prompts')).toBeInTheDocument()
    expect(screen.getByText('Journal')).toBeInTheDocument()
    expect(screen.getByText('Catalogue')).toBeInTheDocument()
  })

  it('affiche le formulaire config avec le provider chargé', async () => {
    renderWithClient(<LiteLLMConfigPage />)
    await waitFor(() => expect(api.aiGetSettings).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByLabelText('Fournisseur')).toBeInTheDocument())
    expect(screen.getByLabelText('Modèle')).toBeInTheDocument()
  })

  it('test connexion réussi affiche le toast', async () => {
    api.aiTestConnection.mockResolvedValue({
      status: 'ok',
      data: { ok: true, provider: 'mistral', model: 'mistral-small-latest' },
      errors: [],
    })
    renderWithClient(<LiteLLMConfigPage />)
    await waitFor(() => expect(screen.getByLabelText('Fournisseur')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Tester la connexion/i }))
    await waitFor(() => expect(api.aiTestConnection).toHaveBeenCalledTimes(1))
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining('mistral'))
  })

  it('cliquer sur un fournisseur dans la sidebar affiche uniquement ce fournisseur', async () => {
    api.aiGetRegistry.mockResolvedValue(REGISTRY_TWO_PROVIDERS)
    renderWithClient(<LiteLLMConfigPage />)
    await userEvent.click(screen.getByRole('button', { name: /Catalogue/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Mistral AI/i })).toBeInTheDocument(),
    )
    await userEvent.click(screen.getByRole('button', { name: /Mistral AI/i }))
    await waitFor(() => expect(screen.getByText('mistral-small-latest')).toBeInTheDocument())
    expect(screen.queryByText('gpt-4o-mini')).not.toBeInTheDocument()
  })

  it("test connexion échoué affiche l'erreur", async () => {
    api.aiTestConnection.mockResolvedValue({
      status: 'error',
      data: null,
      errors: ['Proxy injoignable.'],
    })
    renderWithClient(<LiteLLMConfigPage />)
    await waitFor(() => expect(screen.getByLabelText('Fournisseur')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Tester la connexion/i }))
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Proxy injoignable.'))
  })
})
