import { useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'
import { useEmojis } from '@/services/referenceQueries'

type Emoji = { id: number; code: string }

export function EmojisPage() {
  const qc = useQueryClient()
  const { data: emojis = [] } = useEmojis() as { data?: Emoji[] }

  const [newCode, setNewCode] = useState('')

  const createMut = useMutation({
    mutationFn: (payload: { code: string }) => apiClient.createEmoji(payload),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Création impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.emojis })
      setNewCode('')
      toast.success('Emoji ajouté.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient.deleteEmoji(id),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Suppression impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.emojis })
      toast.success('Emoji supprimé.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const code = newCode.trim()
    if (!code) return
    createMut.mutate({ code })
  }

  function handleDelete(id: number, code: string) {
    if (!window.confirm(`Supprimer l'emoji « ${code} » ? Cette action est irréversible.`)) return
    deleteMut.mutate(id)
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-(--color-text-primary)">Emojis</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">
        Gérez les codes emoji disponibles dans le corpus.
      </p>

      <form onSubmit={handleAdd} className="mb-6 flex items-center gap-2">
        <input
          type="text"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Code emoji (ex : 🌟)"
          aria-label="Code emoji"
          className="rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
        />
        <button
          type="submit"
          disabled={!newCode.trim() || createMut.isPending}
          className="flex items-center gap-1.5 rounded-md bg-(--color-action) px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-action-hover) disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} weight="bold" aria-hidden="true" />
          Ajouter
        </button>
      </form>

      <div className="divide-y divide-(--color-border) rounded-lg border border-(--color-border)">
        {emojis.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-(--color-text-placeholder)">
            Aucun emoji enregistré.
          </p>
        ) : (
          emojis.map((emoji) => (
            <div key={emoji.id} className="flex items-center justify-between px-4 py-2">
              <span className="text-lg" aria-label={emoji.code}>
                {emoji.code}
              </span>
              <button
                onClick={() => handleDelete(emoji.id, emoji.code)}
                className="rounded p-1 text-(--color-text-placeholder) transition-colors hover:bg-(--color-bg-button) hover:text-(--color-danger-text)"
                aria-label={`Supprimer ${emoji.code}`}
              >
                <Trash size={14} aria-hidden="true" />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="mt-2 text-right text-xs text-(--color-text-placeholder)">
        {emojis.length} emoji{emojis.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
