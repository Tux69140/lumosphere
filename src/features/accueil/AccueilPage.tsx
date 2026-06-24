// src/features/accueil/AccueilPage.tsx
import { useEffect, useState } from 'react'
import { apiClient } from '@/services/api'
import { CitationCard } from '@/components/CitationCard'

type Citation = {
  id: number
  contenu: string
  auteur_nom: string | null
  theme_nom: string | null
  mots_cles: { id: number; mot: string }[]
}

export function AccueilPage() {
  const [citations, setCitations] = useState<Citation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .findCitations()
      .then((res) => {
        if (res.status === 'ok' && res.data) {
          setCitations(res.data.items as Citation[])
        } else {
          setError(res.errors?.[0] ?? 'Erreur de chargement')
        }
      })
      .catch(() => setError('Impossible de contacter le serveur'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-(--color-text-secondary)">
          {loading
            ? 'Chargement…'
            : `${citations.length} entrée${citations.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-text)">
          {error}
        </div>
      )}

      {!loading && !error && citations.length === 0 && (
        <p className="text-sm text-(--color-text-placeholder)">Aucune entrée</p>
      )}

      <div className="flex flex-col gap-4">
        {citations.map((c) => (
          <CitationCard
            key={c.id}
            contenu={c.contenu}
            auteur_nom={c.auteur_nom}
            theme_nom={c.theme_nom}
            mots_cles={c.mots_cles.map((k) => k.mot)}
          />
        ))}
      </div>
    </div>
  )
}
