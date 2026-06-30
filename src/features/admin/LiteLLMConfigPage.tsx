import { useState } from 'react'
import {
  Robot,
  Spinner,
  CheckCircle,
  WarningCircle,
  Gear,
  TextT,
  ClockCounterClockwise,
  FloppyDisk,
  Rows,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'
import { AiCatalogTab } from './AiCatalogTab'

type Tab = 'config' | 'prompts' | 'logs' | 'catalogue'

const TABS: { key: Tab; label: string; icon: typeof Gear }[] = [
  { key: 'config', label: 'Configuration', icon: Gear },
  { key: 'prompts', label: 'Prompts', icon: TextT },
  { key: 'logs', label: 'Journal', icon: ClockCounterClockwise },
  { key: 'catalogue', label: 'Catalogue', icon: Rows },
]

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  mistral: 'Mistral AI',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
  gemini: 'Google Gemini',
}

type UsageSummary = {
  total_usd: number
  by_provider: Record<string, { subtotal_usd: number }>
}

function CompactUsageSummary() {
  const { data } = useQuery({
    queryKey: queryKeys.aiUsage,
    queryFn: () => apiClient.aiUsageSummary(),
  })
  const usage = data?.data as UsageSummary | undefined
  if (!usage || usage.total_usd === 0) return null

  return (
    <div className="border-t border-(--color-border) p-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-(--color-text-secondary)">
        Dépense estimée
      </p>
      <p className="mb-2 font-mono text-sm font-semibold text-(--color-text-primary)">
        ${usage.total_usd.toFixed(4)}
      </p>
      {Object.entries(usage.by_provider).map(([key, p]) => (
        <div key={key} className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate text-(--color-text-secondary)">
            {PROVIDER_LABELS[key] ?? key}
          </span>
          <span className="shrink-0 font-mono text-(--color-text-secondary)">
            ${p.subtotal_usd.toFixed(4)}
          </span>
        </div>
      ))}
      <p className="mt-2 text-xs text-(--color-text-placeholder)">
        Tokens journalisés × tarifs catalogue
      </p>
    </div>
  )
}

type RegistryProviders = { providers: Record<string, unknown[]>; last_refreshed_at: string | null }

export function LiteLLMConfigPage() {
  const [tab, setTab] = useState<Tab>('config')
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  const { data: registryRes } = useQuery({
    queryKey: queryKeys.aiRegistry,
    queryFn: () => apiClient.aiGetRegistry(),
    enabled: tab === 'catalogue',
  })
  const providerKeys = Object.keys(
    (registryRes?.data as RegistryProviders | undefined)?.providers ?? {},
  )
  const effectiveProvider = selectedProvider ?? providerKeys[0] ?? null

  return (
    <div className="flex flex-col gap-3 pb-4 pt-2">
      <h1 className="text-xl font-semibold text-(--color-text-primary)">
        Configuration IA (LiteLLM)
      </h1>

      {/* Container borné : sidebar + contenu scrollent chacun indépendamment */}
      <div
        className="flex overflow-hidden rounded-lg border border-(--color-border)"
        style={{ height: 'calc(100vh - 11rem)' }}
      >
        {/* Sidebar gauche navigation */}
        <aside className="flex w-52 shrink-0 flex-col overflow-y-auto">
          <nav className="flex-1 p-2 pt-3">
            {TABS.map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <button
                  onClick={() => setTab(key)}
                  className={[
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    tab === key
                      ? 'bg-(--color-accent-bg) font-medium text-(--color-text-primary)'
                      : 'text-(--color-text-secondary) hover:bg-(--color-bg-button) hover:text-(--color-text-primary)',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                </button>

                {/* Sous-entrées fournisseurs sous l'onglet Catalogue */}
                {key === 'catalogue' && tab === 'catalogue' && providerKeys.length > 0 && (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
                    {providerKeys.map((pk) => (
                      <button
                        key={pk}
                        onClick={() => setSelectedProvider(pk)}
                        className={[
                          'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs transition-colors',
                          effectiveProvider === pk
                            ? 'bg-(--color-accent-bg) text-(--color-text-primary)'
                            : 'text-(--color-text-secondary) hover:bg-(--color-bg-button) hover:text-(--color-text-primary)',
                        ].join(' ')}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            effectiveProvider === pk
                              ? 'bg-(--color-action)'
                              : 'bg-(--color-text-placeholder)'
                          }`}
                          aria-hidden="true"
                        />
                        {PROVIDER_LABELS[pk] ?? pk}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <CompactUsageSummary />
        </aside>

        {/* Contenu de l'onglet actif */}
        <div className="flex-1 overflow-auto border-l border-(--color-border)">
          {tab === 'config' && (
            <div className="p-6">
              <ConfigTab />
            </div>
          )}
          {tab === 'prompts' && (
            <div className="p-6">
              <PromptsTab />
            </div>
          )}
          {tab === 'logs' && (
            <div className="p-6">
              <LogsTab />
            </div>
          )}
          {tab === 'catalogue' && <AiCatalogTab selectedProvider={effectiveProvider} />}
        </div>
      </div>
    </div>
  )
}

// ─────────── Config Tab ───────────

function ConfigTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.aiSettings,
    queryFn: () => apiClient.aiGetSettings(),
  })

  const settings = data?.data
  const catalog = settings?.catalog ?? []

  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [timeout, setTimeout_] = useState(45)
  const [maxRetries, setMaxRetries] = useState(2)
  const [initialized, setInitialized] = useState(false)

  if (settings && !initialized) {
    setProvider(settings.provider)
    setModel(settings.model)
    setTimeout_(settings.timeout_seconds)
    setMaxRetries(settings.max_retries)
    setInitialized(true)
  }

  const selectedProvider = catalog.find((p) => p.key === provider)
  const models = selectedProvider?.models ?? []

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.aiSaveSettings({
        provider,
        model,
        timeout_seconds: timeout,
        max_retries: maxRetries,
      }),
    onSuccess: (res) => {
      if (res.status === 'ok') {
        toast.success('Configuration sauvegardée.')
        void qc.invalidateQueries({ queryKey: queryKeys.aiSettings })
      } else {
        toast.error(res.errors?.[0] ?? 'Erreur.')
      }
    },
  })

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    ok: boolean
    provider: string
    model: string
  } | null>(null)

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    const res = await apiClient.aiTestConnection({ provider, model })
    setTesting(false)
    if (res.status === 'ok' && res.data) {
      setTestResult(res.data)
      toast.success(`Connexion OK — ${res.data.provider}/${res.data.model}`)
    } else {
      toast.error(res.errors?.[0] ?? 'Échec de la connexion.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-(--color-text-secondary)">
        <Spinner className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-(--color-border) bg-(--color-bg-card) p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-(--color-text-secondary)">
          Fournisseur et modèle
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="ai-provider" className="text-sm text-(--color-text-secondary)">
              Fournisseur
            </label>
            <select
              id="ai-provider"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value)
                const p = catalog.find((c) => c.key === e.target.value)
                setModel(p?.models[0] ?? p?.default ?? '')
              }}
              className="rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary)"
            >
              <option value="">— Choisir —</option>
              {catalog.map((p) => (
                <option key={p.key} value={p.key} disabled={!p.configured}>
                  {p.label}
                  {!p.configured ? ' (clé non configurée)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="ai-model" className="text-sm text-(--color-text-secondary)">
              Modèle
            </label>
            <select
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!provider}
              className="rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) disabled:opacity-50"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedProvider?.note && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-(--color-border) bg-(--color-bg-page) px-3 py-2 text-xs text-(--color-text-secondary)">
            <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {selectedProvider.note}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="ai-timeout" className="text-sm text-(--color-text-secondary)">
              Timeout (s)
            </label>
            <input
              id="ai-timeout"
              type="number"
              min={5}
              max={120}
              value={timeout}
              onChange={(e) => setTimeout_(Number(e.target.value))}
              className="rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary)"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ai-retries" className="text-sm text-(--color-text-secondary)">
              Tentatives max
            </label>
            <input
              id="ai-retries"
              type="number"
              min={0}
              max={5}
              value={maxRetries}
              onChange={(e) => setMaxRetries(Number(e.target.value))}
              className="rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary)"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !provider || !model}
            className="inline-flex items-center gap-2 rounded-md bg-(--color-action) px-4 py-2 text-sm text-(--color-action-text) hover:bg-(--color-action-hover) disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <Spinner className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FloppyDisk className="h-4 w-4" aria-hidden="true" />
            )}
            Sauvegarder
          </button>

          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-md border border-(--color-border) bg-(--color-bg-page) px-4 py-2 text-sm text-(--color-text-primary) hover:bg-(--color-bg-card) disabled:opacity-50"
          >
            {testing ? (
              <Spinner className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Robot className="h-4 w-4" aria-hidden="true" />
            )}
            Tester la connexion
          </button>
        </div>

        {testResult && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-(--color-border) bg-(--color-bg-page) px-4 py-3 text-sm">
            <CheckCircle
              className="h-4 w-4 shrink-0 text-(--color-success-text)"
              aria-hidden="true"
            />
            <span className="text-(--color-text-primary)">
              Connexion OK — {testResult.provider}/{testResult.model}
            </span>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-(--color-border) bg-(--color-bg-card) p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-(--color-text-secondary)">
          Clés API (<code className="font-mono">config/config.php</code>)
        </h2>
        <p className="mb-3 text-sm text-(--color-text-secondary)">
          Les clés API ne sont jamais stockées en base de données. Elles doivent être renseignées
          dans le fichier de configuration serveur.
        </p>
        <div className="flex flex-col gap-2">
          {catalog.map((p) => (
            <div
              key={p.key}
              className="flex items-center gap-3 rounded-md border border-(--color-border) bg-(--color-bg-page) px-4 py-2"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${p.configured ? 'bg-(--color-success-text)' : 'bg-(--color-text-placeholder)'}`}
              />
              <span className="text-sm text-(--color-text-primary)">{p.label}</span>
              <code className="ml-auto text-xs font-mono text-(--color-text-secondary)">
                {p.key}_api_key
              </code>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ─────────── Prompts Tab ───────────

function PromptsTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.aiPrompts,
    queryFn: () => apiClient.aiGetPrompts(),
  })

  const prompts = data?.data ?? []

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-(--color-text-secondary)">
        <Spinner className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    )
  }

  if (prompts.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-(--color-text-secondary)">
        Aucun prompt configuré. Exécutez la migration 009 pour créer les prompts par défaut.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {prompts.map((p) => (
        <PromptEditor
          key={p.prompt_key}
          promptKey={p.prompt_key}
          initialContent={p.content}
          updatedAt={p.updated_at}
          onSaved={() => void qc.invalidateQueries({ queryKey: queryKeys.aiPrompts })}
        />
      ))}

      <div className="rounded-lg border border-(--color-border) bg-(--color-bg-card) p-4 text-sm text-(--color-text-secondary)">
        <strong>Variables disponibles :</strong> <code className="font-mono">{'{contenu}'}</code>,{' '}
        <code className="font-mono">{'{kw_list}'}</code> (mots-clés),{' '}
        <code className="font-mono">{'{themes_list}'}</code> (thèmes). Le texte doit demander une
        réponse JSON.
      </div>
    </div>
  )
}

const PROMPT_LABELS: Record<string, string> = {
  suggest_keywords: 'Suggestion de mots-clés',
  suggest_theme: 'Suggestion de thème',
}

function PromptEditor({
  promptKey,
  initialContent,
  updatedAt,
  onSaved,
}: {
  promptKey: string
  initialContent: string
  updatedAt: string
  onSaved: () => void
}) {
  const [content, setContent] = useState(initialContent)
  const dirty = content !== initialContent

  const mutation = useMutation({
    mutationFn: () => apiClient.aiUpdatePrompt(promptKey, content),
    onSuccess: (res) => {
      if (res.status === 'ok') {
        toast.success(`Prompt « ${PROMPT_LABELS[promptKey] ?? promptKey} » sauvegardé.`)
        onSaved()
      } else {
        toast.error(res.errors?.[0] ?? 'Erreur.')
      }
    },
  })

  return (
    <section className="rounded-lg border border-(--color-border) bg-(--color-bg-card) p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-(--color-text-primary)">
          {PROMPT_LABELS[promptKey] ?? promptKey}
        </h2>
        <span className="text-xs text-(--color-text-placeholder)">
          Modifié le {new Date(updatedAt).toLocaleDateString('fr-FR')}
        </span>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
        className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 font-mono text-sm text-(--color-text-primary) focus:outline-none focus:ring-2 focus:ring-(--color-action)"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!dirty || mutation.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-(--color-action) px-4 py-2 text-sm text-(--color-action-text) hover:bg-(--color-action-hover) disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Spinner className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <FloppyDisk className="h-4 w-4" aria-hidden="true" />
          )}
          Sauvegarder
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => setContent(initialContent)}
            className="text-sm text-(--color-text-secondary) underline hover:text-(--color-text-primary)"
          >
            Annuler
          </button>
        )}
      </div>
    </section>
  )
}

// ─────────── Logs Tab ───────────

function LogsTab() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: queryKeys.aiLogs,
    queryFn: ({ pageParam }) => apiClient.aiGetLogs(pageParam ? { cursor: pageParam } : undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data?.next_cursor ?? undefined,
  })

  const logs = data?.pages.flatMap((p) => p.data?.items ?? []) ?? []

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-(--color-text-secondary)">
        <Spinner className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-(--color-text-secondary)">
        Aucun appel IA enregistré.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-(--color-border)">
        <table className="w-full text-left text-sm">
          <thead className="bg-(--color-bg-card) text-xs uppercase text-(--color-text-secondary)">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Fournisseur</th>
              <th className="px-3 py-2">Modèle</th>
              <th className="px-3 py-2 text-right">Tokens</th>
              <th className="px-3 py-2 text-right">Latence</th>
              <th className="px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-border)">
            {logs.map((log) => (
              <tr key={log.id} className="bg-(--color-bg-page)">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-(--color-text-secondary)">
                  {new Date(log.created_at).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-3 py-2 text-(--color-text-primary)">
                  {ACTION_LABELS[log.action] ?? log.action}
                </td>
                <td className="px-3 py-2 text-(--color-text-secondary)">{log.provider}</td>
                <td className="px-3 py-2 font-mono text-xs text-(--color-text-secondary)">
                  {log.model}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs text-(--color-text-secondary)">
                  {log.prompt_tokens + log.completion_tokens}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs text-(--color-text-secondary)">
                  {log.latency_ms} ms
                </td>
                <td className="px-3 py-2">
                  {log.status === 'ok' ? (
                    <span className="inline-flex items-center gap-1 text-xs text-(--color-success-text)">
                      <CheckCircle className="h-3.5 w-3.5" /> OK
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-xs text-(--color-danger-text)"
                      title={log.error_message ?? undefined}
                    >
                      <WarningCircle className="h-3.5 w-3.5" /> Erreur
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasNextPage && (
        <button
          type="button"
          onClick={() => void fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mx-auto inline-flex items-center gap-2 rounded-md border border-(--color-border) bg-(--color-bg-card) px-4 py-2 text-sm text-(--color-text-secondary) hover:bg-(--color-bg-page) disabled:opacity-50"
        >
          {isFetchingNextPage && <Spinner className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Charger 50 de plus
        </button>
      )}
    </div>
  )
}

const ACTION_LABELS: Record<string, string> = {
  suggest_keywords: 'Mots-clés',
  suggest_theme: 'Thème',
  test_connection: 'Test connexion',
}
