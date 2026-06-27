import { useState, useRef } from 'react'
import { MagnifyingGlass, Plus, Trash, X, PencilSimple } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'
import { useKeywords, useKeywordUsages } from '@/services/referenceQueries'

type Keyword = { id: number; mot: string; citation_count: number }

export function KeywordsPage() {
  const qc = useQueryClient()
  const { data: allKeywords = [] } = useKeywords() as { data?: Keyword[] }

  const [search, setSearch] = useState('')
  const [newMot, setNewMot] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [openUsagesId, setOpenUsagesId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  const { data: usages = [], isFetching: usagesFetching } = useKeywordUsages(openUsagesId)

  const keywords = search.trim()
    ? allKeywords.filter((k) => k.mot.includes(search.trim().toLowerCase()))
    : allKeywords

  const createMut = useMutation({
    mutationFn: (payload: { mot: string }) => apiClient.createKeyword(payload),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Création impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.keywords })
      setNewMot('')
      inputRef.current?.focus()
      toast.success('Mot-clé ajouté.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient.deleteKeyword(id),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Suppression impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.keywords })
      toast.success('Mot-clé supprimé.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })

  const updateMut = useMutation({
    mutationFn: (vars: { id: number; mot: string }) => apiClient.updateKeyword(vars.id, vars.mot),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Modification impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.keywords })
      setEditingId(null)
      toast.success('Mot-clé modifié.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const mot = newMot.trim().toLowerCase()
    if (!mot) return
    createMut.mutate({ mot })
  }

  function handleDelete(id: number, mot: string) {
    if (!window.confirm(`Supprimer le mot-clé « ${mot} » ? Cette action est irréversible.`)) return
    deleteMut.mutate(id)
  }

  function startEdit(k: Keyword) {
    setEditingId(k.id)
    setEditValue(k.mot)
    setTimeout(() => {
      editRef.current?.focus()
      editRef.current?.select()
    }, 0)
  }

  function commitEdit() {
    if (editingId === null) return
    const mot = editValue.trim().toLowerCase()
    if (!mot) {
      setEditingId(null)
      return
    }
    updateMut.mutate({ id: editingId, mot })
  }

  function toggleUsages(id: number) {
    setOpenUsagesId(openUsagesId === id ? null : id)
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
          disabled={!newMot.trim() || createMut.isPending}
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

      <div className="divide-y divide-(--color-border) rounded-lg border border-(--color-border)">
        {keywords.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-(--color-text-placeholder)">
            {search ? 'Aucun mot-clé correspondant.' : 'Aucun mot-clé.'}
          </p>
        ) : (
          keywords.map((k) => (
            <div key={k.id} className="group">
              <div className="flex items-center justify-between px-4 py-2 hover:bg-(--color-bg-button)">
                {editingId === k.id ? (
                  <input
                    ref={editRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        commitEdit()
                      }
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={() => setEditingId(null)}
                    aria-label={`Modifier ${k.mot} en cours`}
                    className="flex-1 rounded border border-(--color-action) bg-(--color-bg-field) px-2 py-0.5 text-sm text-(--color-text-primary) focus-visible:outline-none"
                  />
                ) : (
                  <span className="text-sm text-(--color-text-primary)">{k.mot}</span>
                )}

                <div className="flex items-center gap-1">
                  {editingId !== k.id && (
                    <button
                      onClick={() => startEdit(k)}
                      className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 text-(--color-text-placeholder) hover:bg-(--color-bg-button) hover:text-(--color-text-primary)"
                      aria-label={`Modifier ${k.mot}`}
                    >
                      <PencilSimple size={14} aria-hidden="true" />
                    </button>
                  )}
                  {k.citation_count > 0 ? (
                    <button
                      onClick={() => toggleUsages(k.id)}
                      className="rounded px-2 py-0.5 text-xs font-medium text-(--color-text-secondary) hover:bg-(--color-bg-button)"
                      aria-label={`${k.citation_count} entrée${k.citation_count > 1 ? 's' : ''} utilisent ${k.mot}`}
                    >
                      {k.citation_count} entrée{k.citation_count > 1 ? 's' : ''}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(k.id, k.mot)}
                      className="rounded p-1 text-(--color-text-placeholder) transition-colors hover:bg-(--color-bg-button) hover:text-(--color-danger-text)"
                      aria-label={`Supprimer ${k.mot}`}
                    >
                      <Trash size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {openUsagesId === k.id && (
                <div className="border-t border-(--color-border) bg-(--color-bg-card) px-4 py-3">
                  {usagesFetching ? (
                    <p className="text-xs text-(--color-text-placeholder)">Chargement…</p>
                  ) : usages.length === 0 ? (
                    <p className="text-xs text-(--color-text-placeholder)">
                      Aucune entrée trouvée.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {usages.map((u) => (
                        <li key={u.citation_id} className="text-xs text-(--color-text-secondary)">
                          <span className="font-mono text-(--color-text-placeholder)">
                            #{u.citation_id}
                          </span>{' '}
                          {u.titre}…
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
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
