import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'
import { AiCatalogTab } from '../AiCatalogTab'

const REGISTRY_EMPTY = {
  status: 'ok',
  data: { providers: {}, last_refreshed_at: null },
  errors: [],
}

const REGISTRY_WITH_MODELS = {
  status: 'ok',
  data: {
    last_refreshed_at: '2026-06-29 10:00:00',
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
        {
          model_id: 'mistral-old',
          label: 'mistral-old',
          enabled: false,
          deprecated: true,
          pricing_input_per_million_usd: null,
          pricing_output_per_million_usd: null,
          pricing_source: 'unknown',
          context_window: 0,
          supports_json: false,
          supports_vision: false,
          notes: null,
          usable: false,
        },
      ],
    },
  },
  errors: [],
}

const REGISTRY_TWO_PROVIDERS = {
  status: 'ok',
  data: {
    last_refreshed_at: '2026-06-29 10:00:00',
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

const USAGE_EMPTY = {
  status: 'ok',
  data: { total_usd: 0, by_provider: {} },
  errors: [],
}

const api = vi.hoisted(() => ({
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

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMock }))

beforeEach(() => {
  vi.resetAllMocks()
  api.aiGetRegistry.mockResolvedValue(REGISTRY_EMPTY)
  api.aiUsageSummary.mockResolvedValue(USAGE_EMPTY)
})

describe('AiCatalogTab', () => {
  it('affiche le spinner au chargement', () => {
    api.aiGetRegistry.mockReturnValue(new Promise(() => {}))
    renderWithClient(<AiCatalogTab />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it("affiche 'Jamais rafraîchi' quand le registre est vide", async () => {
    renderWithClient(<AiCatalogTab />)
    await waitFor(() => expect(screen.getByText(/Jamais rafraîchi/i)).toBeInTheDocument())
    expect(screen.getByText(/Aucun modèle dans le catalogue/i)).toBeInTheDocument()
  })

  it("affiche la date de mise à jour et les modèles d'un fournisseur", async () => {
    api.aiGetRegistry.mockResolvedValue(REGISTRY_WITH_MODELS)
    renderWithClient(<AiCatalogTab />)
    await waitFor(() => expect(screen.getByText('Mistral AI')).toBeInTheDocument())
    expect(screen.getByText('mistral-small-latest')).toBeInTheDocument()
    expect(screen.getByText(/Mis à jour/i)).toBeInTheDocument()
  })

  it('la ligne dépréciée a la classe opacity-50 (après affichage des inadaptés)', async () => {
    api.aiGetRegistry.mockResolvedValue(REGISTRY_WITH_MODELS)
    renderWithClient(<AiCatalogTab />)
    await waitFor(() =>
      expect(screen.getByLabelText('Activer mistral-small-latest')).toBeInTheDocument(),
    )
    // Désactiver le masquage des inadaptés
    const toggle = screen.getByRole('checkbox', { name: /Masquer les inadaptés/i })
    await userEvent.click(toggle)
    await waitFor(() => expect(screen.getByText('mistral-old')).toBeInTheDocument())
    const cell = screen.getByText('mistral-old').closest('tr')
    expect(cell?.className).toContain('opacity-50')
  })

  it("le badge 'Déprécié' est affiché après affichage des inadaptés", async () => {
    api.aiGetRegistry.mockResolvedValue(REGISTRY_WITH_MODELS)
    renderWithClient(<AiCatalogTab />)
    await waitFor(() =>
      expect(screen.getByLabelText('Activer mistral-small-latest')).toBeInTheDocument(),
    )
    const toggle = screen.getByRole('checkbox', { name: /Masquer les inadaptés/i })
    await userEvent.click(toggle)
    await waitFor(() => expect(screen.getByText('Déprécié')).toBeInTheDocument())
  })

  it('affiche uniquement le fournisseur sélectionné quand selectedProvider est défini', async () => {
    api.aiGetRegistry.mockResolvedValue(REGISTRY_TWO_PROVIDERS)
    renderWithClient(<AiCatalogTab selectedProvider="mistral" />)
    await waitFor(() => expect(screen.getByText('mistral-small-latest')).toBeInTheDocument())
    expect(screen.queryByText('gpt-4o-mini')).not.toBeInTheDocument()
  })

  it('affiche tous les fournisseurs quand selectedProvider est null', async () => {
    api.aiGetRegistry.mockResolvedValue(REGISTRY_TWO_PROVIDERS)
    renderWithClient(<AiCatalogTab selectedProvider={null} />)
    await waitFor(() => expect(screen.getByText('mistral-small-latest')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument())
  })

  it('le bouton Rafraîchir appelle aiRefreshModels', async () => {
    api.aiGetRegistry.mockResolvedValue(REGISTRY_WITH_MODELS)
    api.aiRefreshModels.mockResolvedValue({
      status: 'ok',
      data: { providers: [{ key: 'mistral', count: 2, error: null }], refreshed_at: '' },
      errors: [],
    })
    renderWithClient(<AiCatalogTab />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Rafraîchir/i })).toBeInTheDocument(),
    )
    await userEvent.click(screen.getByRole('button', { name: /Rafraîchir/i }))
    await waitFor(() => expect(api.aiRefreshModels).toHaveBeenCalledTimes(1))
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining('Catalogue mis à jour'))
  })

  it("le refresh affiche les erreurs fournisseur après l'opération", async () => {
    api.aiGetRegistry.mockResolvedValue(REGISTRY_WITH_MODELS)
    api.aiRefreshModels.mockResolvedValue({
      status: 'ok',
      data: {
        providers: [{ key: 'mistral', count: 0, error: 'Clé API refusée.' }],
        refreshed_at: '',
      },
      errors: [],
    })
    renderWithClient(<AiCatalogTab />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Rafraîchir/i })).toBeInTheDocument(),
    )
    await userEvent.click(screen.getByRole('button', { name: /Rafraîchir/i }))
    await waitFor(() => expect(toastMock.warning).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(/Clé API refusée/i)).toBeInTheDocument())
  })

  it('la checkbox toggle appelle aiToggleModel', async () => {
    api.aiGetRegistry.mockResolvedValue(REGISTRY_WITH_MODELS)
    api.aiToggleModel.mockResolvedValue({ status: 'ok', data: null, errors: [] })
    renderWithClient(<AiCatalogTab />)
    await waitFor(() =>
      expect(screen.getByLabelText('Activer mistral-small-latest')).toBeInTheDocument(),
    )
    const checkbox = screen.getByLabelText('Activer mistral-small-latest')
    expect(checkbox).toBeChecked()
    await userEvent.click(checkbox)
    await waitFor(() =>
      expect(api.aiToggleModel).toHaveBeenCalledWith('mistral', 'mistral-small-latest', false),
    )
  })
})
