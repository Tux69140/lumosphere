import { useState, Fragment } from 'react'
import {
  ArrowsClockwise,
  CheckCircle,
  FloppyDisk,
  PencilSimple,
  Spinner,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'

// ─────────── Types ───────────

type RegistryModel = {
  model_id: string
  label: string
  enabled: boolean
  deprecated: boolean
  pricing_input_per_million_usd: number | null
  pricing_output_per_million_usd: number | null
  pricing_source: string
  context_window: number
  supports_json: boolean
  supports_vision: boolean
  notes: string | null
  usable: boolean
}

type RegistryData = {
  providers: Record<string, RegistryModel[]>
  last_refreshed_at: string | null
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  mistral: 'Mistral AI',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
  gemini: 'Google Gemini',
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k`
  return n.toString()
}

// ─────────── Catalogue Tab ───────────

export function AiCatalogTab({ selectedProvider }: { selectedProvider?: string | null }) {
  const qc = useQueryClient()

  const { data: registryRes, isLoading } = useQuery({
    queryKey: queryKeys.aiRegistry,
    queryFn: () => apiClient.aiGetRegistry(),
  })

  const refreshMutation = useMutation({
    mutationFn: () => apiClient.aiRefreshModels(),
    onSuccess: (res) => {
      if (res.status === 'ok') {
        const providers = res.data?.providers ?? []
        const errCount = providers.filter((p) => p.error).length
        if (errCount === 0) {
          toast.success(
            `Catalogue mis à jour (${providers.length} fournisseur${providers.length > 1 ? 's' : ''}).`,
          )
        } else {
          toast.warning(
            `Mis à jour avec ${errCount} erreur${errCount > 1 ? 's' : ''}. Voir le détail ci-dessous.`,
          )
        }
        void qc.invalidateQueries({ queryKey: queryKeys.aiRegistry })
        void qc.invalidateQueries({ queryKey: queryKeys.aiSettings })
      } else {
        toast.error(res.errors?.[0] ?? 'Erreur lors du rafraîchissement.')
      }
    },
  })

  const registry = registryRes?.data as RegistryData | undefined

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-(--color-text-secondary)">
        <Spinner className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    )
  }

  const providerEntries = Object.entries(registry?.providers ?? {})
  const visibleEntries = selectedProvider
    ? providerEntries.filter(([key]) => key === selectedProvider)
    : providerEntries

  const handleChanged = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.aiRegistry })
    void qc.invalidateQueries({ queryKey: queryKeys.aiSettings })
  }

  const refreshProviders = (refreshMutation.data?.data?.providers ?? []) as Array<{
    key: string
    count: number
    error: string | null
  }>

  return (
    <div className="flex flex-col">
      {/* Barre d'en-tête collante */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-(--color-border) bg-(--color-bg-card) px-5 py-2">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-(--color-text-secondary)">
            Catalogue des modèles
          </h2>
          <p className="mt-0.5 text-xs text-(--color-text-placeholder)">
            {registry?.last_refreshed_at
              ? `Mis à jour : ${new Date(registry.last_refreshed_at).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Jamais rafraîchi — cliquez « Rafraîchir » pour initialiser.'}
          </p>
          {refreshMutation.isSuccess && refreshProviders.some((p) => p.error) && (
            <div className="mt-1.5 flex flex-col gap-1">
              {refreshProviders
                .filter((p) => p.error)
                .map((p) => (
                  <div
                    key={p.key}
                    className="flex items-start gap-1.5 text-xs text-(--color-text-secondary)"
                  >
                    <WarningCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      <strong>{PROVIDER_LABELS[p.key] ?? p.key} :</strong> {p.error}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-(--color-action) px-3 py-1.5 text-sm text-(--color-action-text) hover:bg-(--color-action-hover) disabled:opacity-50"
        >
          {refreshMutation.isPending ? (
            <Spinner className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
          )}
          Rafraîchir
        </button>
      </div>

      {/* Tableaux par fournisseur */}
      <div className="flex flex-col gap-4 p-5">
        {visibleEntries.length === 0 ? (
          <p className="py-6 text-center text-sm text-(--color-text-secondary)">
            Aucun modèle dans le catalogue. Cliquez « Rafraîchir » pour initialiser.
          </p>
        ) : (
          visibleEntries.map(([providerKey, models]) => (
            <ProviderSection
              key={providerKey}
              providerKey={providerKey}
              models={models}
              onChanged={handleChanged}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─────────── Section par fournisseur ───────────

function ProviderSection({
  providerKey,
  models,
  onChanged,
}: {
  providerKey: string
  models: RegistryModel[]
  onChanged: () => void
}) {
  const [editingModel, setEditingModel] = useState<string | null>(null)
  const [hideUnusable, setHideUnusable] = useState(true)
  const visible = hideUnusable ? models.filter((m) => !m.deprecated && m.supports_json) : models

  return (
    <section className="rounded-lg border border-(--color-border) bg-(--color-bg-card) p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-(--color-text-secondary)">
          {PROVIDER_LABELS[providerKey] ?? providerKey}
        </h2>
        {models.some((m) => m.deprecated || !m.supports_json) && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-(--color-text-secondary)">
            <input
              type="checkbox"
              checked={hideUnusable}
              onChange={(e) => setHideUnusable(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer"
            />
            Masquer les inadaptés
          </label>
        )}
      </div>

      <div className="rounded-lg border border-(--color-border)">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-[50px] z-10 bg-(--color-bg-card) text-xs uppercase text-(--color-text-secondary)">
            <tr>
              <th className="px-3 py-2">Modèle</th>
              <th className="px-3 py-2 text-right">Prix entrée</th>
              <th className="px-3 py-2 text-right">Prix sortie</th>
              <th className="px-3 py-2 text-right">Contexte</th>
              <th className="px-3 py-2 text-center">JSON</th>
              <th className="px-3 py-2 text-center">Vision</th>
              <th className="px-3 py-2 text-center">Activé</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-border)">
            {visible.map((model) => (
              <Fragment key={model.model_id}>
                <ModelRow
                  providerKey={providerKey}
                  model={model}
                  onToggle={onChanged}
                  isEditing={editingModel === model.model_id}
                  onEdit={() =>
                    setEditingModel(editingModel === model.model_id ? null : model.model_id)
                  }
                />
                {editingModel === model.model_id && (
                  <ModelEditRow
                    providerKey={providerKey}
                    model={model}
                    onSaved={() => {
                      setEditingModel(null)
                      onChanged()
                    }}
                    onCancel={() => setEditingModel(null)}
                  />
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─────────── Ligne de modèle ───────────

function ModelRow({
  providerKey,
  model,
  onToggle,
  isEditing,
  onEdit,
}: {
  providerKey: string
  model: RegistryModel
  onToggle: () => void
  isEditing: boolean
  onEdit: () => void
}) {
  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => apiClient.aiToggleModel(providerKey, model.model_id, enabled),
    onSuccess: (res) => {
      if (res.status === 'ok') {
        onToggle()
      } else {
        toast.error(res.errors?.[0] ?? 'Erreur.')
      }
    },
  })

  return (
    <tr className={`bg-(--color-bg-page)${model.deprecated ? ' opacity-50' : ''}`}>
      <td className="px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs text-(--color-text-primary)">{model.model_id}</span>
          {model.deprecated && (
            <span className="inline-flex items-center gap-1 rounded-full border border-(--color-border) bg-(--color-bg-card) px-2 py-0.5 text-xs text-(--color-text-secondary)">
              <WarningCircle className="h-3 w-3" aria-hidden="true" />
              Déprécié
            </span>
          )}
          {model.pricing_source === 'manual' && (
            <span className="rounded-full border border-(--color-border) bg-(--color-bg-card) px-2 py-0.5 text-xs text-(--color-text-placeholder)">
              Manuel
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs text-(--color-text-secondary)">
        {model.pricing_input_per_million_usd !== null
          ? `$${model.pricing_input_per_million_usd.toFixed(4)}`
          : '—'}
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs text-(--color-text-secondary)">
        {model.pricing_output_per_million_usd !== null
          ? `$${model.pricing_output_per_million_usd.toFixed(4)}`
          : '—'}
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs text-(--color-text-secondary)">
        {model.context_window > 0 ? formatTokens(model.context_window) : '—'}
      </td>
      <td className="px-3 py-2 text-center">
        {model.supports_json ? (
          <CheckCircle className="mx-auto h-4 w-4 text-(--color-success-text)" aria-label="Oui" />
        ) : (
          <span className="text-(--color-text-placeholder)" aria-label="Non">
            —
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {model.supports_vision ? (
          <CheckCircle className="mx-auto h-4 w-4 text-(--color-success-text)" aria-label="Oui" />
        ) : (
          <span className="text-(--color-text-placeholder)" aria-label="Non">
            —
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {toggleMutation.isPending ? (
          <Spinner className="mx-auto h-4 w-4 animate-spin text-(--color-text-secondary)" />
        ) : (
          <input
            type="checkbox"
            checked={model.enabled}
            disabled={model.deprecated || !model.supports_json}
            onChange={(e) => toggleMutation.mutate(e.target.checked)}
            className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Activer ${model.model_id}`}
          />
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={onEdit}
          className={`inline-flex items-center gap-1 rounded-md border border-(--color-border) px-2 py-1 text-xs text-(--color-text-secondary) hover:bg-(--color-bg-card) ${
            isEditing ? 'bg-(--color-bg-card)' : 'bg-(--color-bg-page)'
          }`}
          aria-label={`Modifier ${model.model_id}`}
        >
          {isEditing ? (
            <X className="h-3 w-3" aria-hidden="true" />
          ) : (
            <PencilSimple className="h-3 w-3" aria-hidden="true" />
          )}
          {isEditing ? 'Fermer' : 'Éditer'}
        </button>
      </td>
    </tr>
  )
}

// ─────────── Ligne d'édition inline ───────────

function ModelEditRow({
  providerKey,
  model,
  onSaved,
  onCancel,
}: {
  providerKey: string
  model: RegistryModel
  onSaved: () => void
  onCancel: () => void
}) {
  const [priceIn, setPriceIn] = useState(model.pricing_input_per_million_usd?.toString() ?? '')
  const [priceOut, setPriceOut] = useState(model.pricing_output_per_million_usd?.toString() ?? '')
  const [context, setContext] = useState(
    model.context_window > 0 ? model.context_window.toString() : '',
  )

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.aiOverrideModel({
        provider: providerKey,
        model_id: model.model_id,
        pricing_input_per_million_usd: priceIn !== '' ? parseFloat(priceIn) : null,
        pricing_output_per_million_usd: priceOut !== '' ? parseFloat(priceOut) : null,
        context_window: context !== '' ? parseInt(context, 10) : 0,
      }),
    onSuccess: (res) => {
      if (res.status === 'ok') {
        toast.success('Tarifs mis à jour.')
        onSaved()
      } else {
        toast.error(res.errors?.[0] ?? 'Erreur.')
      }
    },
  })

  const resetMutation = useMutation({
    mutationFn: () =>
      apiClient.aiOverrideModel({
        provider: providerKey,
        model_id: model.model_id,
        reset_pricing: true,
      }),
    onSuccess: (res) => {
      if (res.status === 'ok') {
        toast.success('Tarifs réinitialisés depuis la base LiteLLM.')
        onSaved()
      } else {
        toast.error(res.errors?.[0] ?? 'Erreur.')
      }
    },
  })

  return (
    <tr className="bg-(--color-bg-card)">
      <td colSpan={8} className="px-3 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-(--color-text-secondary)">
              Prix entrée ($/M tokens)
            </label>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={priceIn}
              onChange={(e) => setPriceIn(e.target.value)}
              placeholder="ex : 0.1500"
              className="w-36 rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-1.5 text-sm text-(--color-text-primary)"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-(--color-text-secondary)">
              Prix sortie ($/M tokens)
            </label>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={priceOut}
              onChange={(e) => setPriceOut(e.target.value)}
              placeholder="ex : 0.6000"
              className="w-36 rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-1.5 text-sm text-(--color-text-primary)"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-(--color-text-secondary)">Contexte (tokens)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="ex : 128000"
              className="w-36 rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-1.5 text-sm text-(--color-text-primary)"
            />
          </div>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-(--color-action) px-4 py-2 text-sm text-(--color-action-text) hover:bg-(--color-action-hover) disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Spinner className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FloppyDisk className="h-4 w-4" aria-hidden="true" />
            )}
            Enregistrer
          </button>
          {model.pricing_source === 'manual' && (
            <button
              type="button"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              className="inline-flex items-center gap-1 rounded-md border border-(--color-border) bg-(--color-bg-page) px-3 py-2 text-sm text-(--color-text-secondary) hover:bg-(--color-bg-card) disabled:opacity-50"
              title="Recharger les tarifs depuis la base communautaire LiteLLM"
            >
              {resetMutation.isPending ? (
                <Spinner className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
              )}
              Réinitialiser LiteLLM
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-(--color-text-secondary) underline hover:text-(--color-text-primary)"
          >
            Annuler
          </button>
        </div>
      </td>
    </tr>
  )
}
