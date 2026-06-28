import { useState } from 'react'
import { Sparkle, Check, X } from '@phosphor-icons/react'
import { apiClient } from '@/services/api'
import type { LotDocument, DocumentKeyword } from '../types'

type Props = {
  document: LotDocument
  onKeywordsAccepted: (keywordIds: number[]) => void
}

export function SuggestionsIA({ document, onKeywordsAccepted }: Props) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState<Set<string>>(new Set())

  const contenu = document.contenu_revise || document.contenu_brut || ''
  const existingMots = new Set(document.keywords.map((k: DocumentKeyword) => k.mot.toLowerCase()))

  async function handleSuggest() {
    if (!contenu) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.aiSuggestKeywords(document.id, contenu)
      if (res.status === 'error') throw new Error(res.errors[0])
      const fresh = (res.data?.keywords ?? []).filter(
        (kw: string) => !existingMots.has(kw.toLowerCase()),
      )
      setSuggestions(fresh)
      if (fresh.length === 0) setError('Aucune nouvelle suggestion.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur IA')
    } finally {
      setLoading(false)
    }
  }

  async function handleAccept(mot: string) {
    try {
      const res = await apiClient.findOrCreateKeyword(mot)
      if (res.status === 'ok' && res.data) {
        setAccepted((prev) => new Set(prev).add(mot))
        onKeywordsAccepted([res.data.id])
      }
    } catch {
      // Silently ignore — keyword will stay in suggestions
    }
  }

  function handleReject(mot: string) {
    setSuggestions((prev) => prev.filter((s) => s !== mot))
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleSuggest}
        disabled={loading || !contenu}
        className="flex items-center gap-2 rounded-md bg-(--color-accent) px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
      >
        <Sparkle size={16} weight="fill" />
        {loading ? 'Analyse en cours...' : 'Suggérer des mots-clés (IA)'}
      </button>

      {error && <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((mot) => {
            const isAccepted = accepted.has(mot)
            return (
              <span
                key={mot}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
                  isAccepted
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-(--color-tag-bg) text-(--color-tag-text)'
                }`}
              >
                {mot}
                {!isAccepted && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAccept(mot)}
                      className="ml-1 rounded-full p-0.5 hover:bg-green-200 dark:hover:bg-green-800"
                      aria-label={`Accepter ${mot}`}
                    >
                      <Check size={14} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(mot)}
                      className="rounded-full p-0.5 hover:bg-red-200 dark:hover:bg-red-800"
                      aria-label={`Rejeter ${mot}`}
                    >
                      <X size={14} weight="bold" />
                    </button>
                  </>
                )}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
