import { useState } from 'react'
import { Robot, Spinner, CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'

type ConnectionResult = { ok: boolean; model: string } | null

export function LiteLLMConfigPage() {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<ConnectionResult>(null)

  async function handleTest() {
    setTesting(true)
    setResult(null)
    const res = await apiClient.aiTestConnection()
    setTesting(false)
    if (res.status === 'ok' && res.data) {
      setResult(res.data)
      toast.success(`Connexion LiteLLM réussie — modèle : ${res.data.model}`)
    } else {
      toast.error(res.errors?.[0] ?? 'Échec de la connexion LiteLLM.')
    }
  }

  return (
    <div className="mx-auto max-w-xl py-8">
      <h1 className="mb-6 text-xl font-semibold text-(--color-text-primary)">
        Configuration IA (LiteLLM)
      </h1>

      <section className="mb-8 rounded-lg border border-(--color-border) bg-(--color-bg-card) p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-(--color-text-secondary)">
          Tester la connexion
        </h2>
        <p className="mb-4 text-sm text-(--color-text-secondary)">
          Vérifie que le proxy LiteLLM est joignable et que la clé API est valide.
        </p>
        <button
          type="button"
          onClick={() => void handleTest()}
          disabled={testing}
          className="inline-flex items-center gap-2 rounded-md bg-(--color-action) px-4 py-2 text-sm text-(--color-action-text) hover:bg-(--color-action-hover) disabled:opacity-50"
        >
          {testing ? (
            <Spinner className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Robot className="h-4 w-4" aria-hidden="true" />
          )}
          {testing ? 'Test en cours…' : 'Tester la connexion'}
        </button>

        {result !== null && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-(--color-border) bg-(--color-bg-page) px-4 py-3 text-sm">
            <CheckCircle
              className="h-4 w-4 shrink-0 text-(--color-success-text)"
              aria-hidden="true"
            />
            <span className="text-(--color-text-primary)">
              Connexion OK — modèle : <span className="font-mono font-medium">{result.model}</span>
            </span>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-(--color-border) bg-(--color-bg-card) p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-(--color-text-secondary)">
          Variables à définir dans <code className="font-mono">config/config.php</code>
        </h2>
        <p className="mb-4 text-sm text-(--color-text-secondary)">
          Ces clés doivent être renseignées dans le fichier de configuration serveur (hors dépôt
          Git). Le fichier <code className="font-mono">config/config.php.example</code> sert de
          modèle.
        </p>
        <div className="flex flex-col gap-2">
          {[
            {
              key: 'litellm_base_url',
              desc: 'URL de base du proxy LiteLLM (ex. https://your-litellm-proxy.example.com)',
            },
            {
              key: 'litellm_api_key',
              desc: 'Clé API LiteLLM (ex. sk-…)',
            },
            {
              key: 'litellm_model',
              desc: 'Modèle à utiliser (ex. gpt-4o-mini, ou tout modèle disponible sur le proxy)',
            },
          ].map(({ key, desc }) => (
            <div
              key={key}
              className="rounded-md border border-(--color-border) bg-(--color-bg-page) px-4 py-3"
            >
              <div className="flex items-start gap-2">
                <WarningCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-(--color-text-secondary)"
                  aria-hidden="true"
                />
                <div>
                  <code className="text-sm font-mono font-semibold text-(--color-text-primary)">
                    {`$config['${key}']`}
                  </code>
                  <p className="mt-0.5 text-xs text-(--color-text-secondary)">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
