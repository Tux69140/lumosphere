// src/features/accueil/AccueilPage.tsx
import { CitationCard } from '@/components/CitationCard'
import { useAuth } from '@/hooks/useAuth'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'

const ADMIN_ROLES = [1, 2] // Administrateur, Éditeur

export function AccueilPage() {
  const { user } = useAuth()
  const canEdit = user ? ADMIN_ROLES.includes(user.role_id) : false
  const { items, loading, error, hasMore } = useCorpusSearch()

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-(--color-text-secondary)">
          {loading
            ? 'Recherche…'
            : `${items.length} résultat${items.length !== 1 ? 's' : ''}${hasMore ? '+' : ''}`}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-text)">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-(--color-text-placeholder)">Aucune entrée ne correspond.</p>
      )}

      <div className="flex flex-col gap-4">
        {items.map((c) => (
          <CitationCard
            key={c.id}
            contenu={c.contenu}
            oeuvre_nom={c.oeuvre_nom}
            theme_nom={c.theme_nom}
            auteur_nom={c.auteur_nom}
            notes={c.notes}
            mots_cles={(c.mots_cles ?? []).map((k) => k.mot)}
            canEdit={canEdit}
          />
        ))}
      </div>

      {!loading && hasMore && (
        <p className="mt-4 text-center text-xs text-(--color-text-placeholder)">
          Affinez votre recherche pour préciser les résultats.
        </p>
      )}
    </div>
  )
}
