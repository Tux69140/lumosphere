import { useEffect, useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'

type Emoji = { id: number; code: string }

export function EmojisPage() {
  const [emojis, setEmojis] = useState<Emoji[]>([])
  const [newCode, setNewCode] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    apiClient.findEmojis().then((r) => {
      if (r.status === 'ok') setEmojis((r.data ?? []) as Emoji[])
      else toast.error('Impossible de charger les emojis.')
    })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const code = newCode.trim()
    if (!code) return
    setAdding(true)
    const r = await apiClient.createEmoji({ code })
    setAdding(false)
    if (r.status !== 'ok') {
      toast.error((r as { errors?: string[] }).errors?.[0] ?? 'Création impossible.')
      return
    }
    const created = r.data as { id: number }
    setEmojis((prev) =>
      [...prev, { id: created.id, code }].sort((a, b) => a.code.localeCompare(b.code)),
    )
    setNewCode('')
    toast.success(`Emoji « ${code} » ajouté.`)
  }

  async function handleDelete(id: number, code: string) {
    if (!window.confirm(`Supprimer l'emoji « ${code} » ? Cette action est irréversible.`)) return
    const r = await apiClient.deleteEmoji(id)
    if (r.status !== 'ok') {
      toast.error((r as { errors?: string[] }).errors?.[0] ?? 'Suppression impossible.')
      return
    }
    setEmojis((prev) => prev.filter((e) => e.id !== id))
    toast.success(`Emoji « ${code} » supprimé.`)
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
          disabled={!newCode.trim() || adding}
          className="flex items-center gap-1.5 rounded-md bg-(--color-action) px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-action-hover) disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} weight="bold" aria-hidden="true" />
          Ajouter
        </button>
      </form>

      <div className="rounded-lg border border-(--color-border) divide-y divide-(--color-border)">
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
