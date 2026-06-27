import { useEffect, useState, useRef } from 'react'
import { MagnifyingGlass, Plus, Trash, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'

type Keyword = { id: number; mot: string }

export function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [search, setSearch] = useState('')
  const [newMot, setNewMot] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const params = search.trim() ? { search: search.trim() } : undefined
    apiClient.findKeywords(params).then((r) => {
      if (r.status === 'ok') setKeywords((r.data ?? []) as Keyword[])
      else toast.error('Impossible de charger les mots-clés.')
    })
  }, [search])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const mot = newMot.trim().toLowerCase()
    if (!mot) return
    setAdding(true)
    const r = await apiClient.createKeyword({ mot })
    setAdding(false)
    if (r.status !== 'ok') {
      toast.error((r as { errors?: string[] }).errors?.[0] ?? 'Création impossible.')
      return
    }
    const created = r.data as { id: number }
    setKeywords((prev) =>
      [...prev, { id: created.id, mot }].sort((a, b) => a.mot.localeCompare(b.mot)),
    )
    setNewMot('')
    inputRef.current?.focus()
    toast.success(`Mot-clé « ${mot} » ajouté.`)
  }

  async function handleDelete(id: number, mot: string) {
    if (!window.confirm(`Supprimer le mot-clé « ${mot} » ? Cette action est irréversible.`)) return
    const r = await apiClient.deleteKeyword(id)
    if (r.status !== 'ok') {
      toast.error((r as { errors?: string[] }).errors?.[0] ?? 'Suppression impossible.')
      return
    }
    setKeywords((prev) => prev.filter((k) => k.id !== id))
    toast.success(`Mot-clé « ${mot} » supprimé.`)
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-(--color-text-primary)">Mots-clés</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">
        Gérez les mots-clés du corpus. Ils sont normalisés en minuscules.
      </p>

      <form onSubmit={handleAdd} className="mb-6 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newMot}
          onChange={(e) => setNewMot(e.target.value)}
          placeholder="Nouveau mot-clé…"
          aria-label="Nouveau mot-clé"
          className="rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
        />
        <button
          type="submit"
          disabled={!newMot.trim() || adding}
          className="flex items-center gap-1.5 rounded-md bg-(--color-action) px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-action-hover) disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} weight="bold" aria-hidden="true" />
          Ajouter
        </button>
      </form>

      <div className="mb-4 flex items-center gap-2 rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 focus-within:ring-2 focus-within:ring-(--color-action)">
        <MagnifyingGlass
          size={16}
          className="shrink-0 text-(--color-text-placeholder)"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          aria-label="Rechercher des mots-clés"
          className="flex-1 bg-transparent text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Effacer la recherche">
            <X size={14} className="text-(--color-text-placeholder)" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="rounded-lg border border-(--color-border) divide-y divide-(--color-border)">
        {keywords.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-(--color-text-placeholder)">
            {search ? 'Aucun mot-clé correspondant.' : 'Aucun mot-clé.'}
          </p>
        ) : (
          keywords.map((k) => (
            <div key={k.id} className="flex items-center justify-between px-4 py-2">
              <span className="text-sm text-(--color-text-primary)">{k.mot}</span>
              <button
                onClick={() => handleDelete(k.id, k.mot)}
                className="rounded p-1 text-(--color-text-placeholder) transition-colors hover:bg-(--color-bg-button) hover:text-(--color-danger-text)"
                aria-label={`Supprimer ${k.mot}`}
              >
                <Trash size={14} aria-hidden="true" />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="mt-2 text-right text-xs text-(--color-text-placeholder)">
        {keywords.length} mot{keywords.length !== 1 ? 's' : ''}-clé
        {keywords.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
