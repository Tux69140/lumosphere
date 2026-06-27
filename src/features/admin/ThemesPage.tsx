import { useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'
import { useThemes } from '@/services/referenceQueries'

type Theme = {
  id: number
  nom: string
  parent_id: number | null
  chemin: string
  description: string | null
}

const schema = z.object({
  nom: z.string().min(1, 'Le nom est requis.'),
  parent_id: z.number().nullable().optional(),
  description: z.string().optional(),
})

type FormState = { nom: string; parent_id: string; description: string }

const emptyForm: FormState = { nom: '', parent_id: '', description: '' }

export function ThemesPage() {
  const qc = useQueryClient()
  const { data: themes = [] } = useThemes() as { data?: Theme[] }

  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.createTheme(payload),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Création impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.themes })
      setSelectedId((r.data as { id: number }).id)
      toast.success('Thème créé.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })
  const updateMut = useMutation({
    mutationFn: (vars: { id: number; payload: Record<string, unknown> }) =>
      apiClient.updateTheme(vars.id, vars.payload),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Modification impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.themes })
      toast.success('Modifications enregistrées.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient.deleteTheme(id),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Suppression impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.themes })
      setSelectedId(null)
      setForm(emptyForm)
      toast.success('Thème supprimé.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })
  const saving = createMut.isPending || updateMut.isPending

  function selectTheme(id: number) {
    const found = themes.find((t) => t.id === id)
    if (!found) return
    setSelectedId(id)
    setForm({
      nom: found.nom,
      parent_id: found.parent_id !== null ? String(found.parent_id) : '',
      description: found.description ?? '',
    })
    setErrors({})
  }

  function startNew() {
    setSelectedId('new')
    setForm(emptyForm)
    setErrors({})
  }

  function handleSave() {
    const parsed = schema.safeParse({
      nom: form.nom,
      parent_id: form.parent_id ? parseInt(form.parent_id, 10) : null,
      description: form.description,
    })
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState
        fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    const payload = {
      nom: form.nom.trim(),
      parent_id: form.parent_id ? parseInt(form.parent_id, 10) : null,
      description: form.description.trim() || null,
    }
    if (selectedId === 'new') createMut.mutate(payload)
    else if (typeof selectedId === 'number') updateMut.mutate({ id: selectedId, payload })
  }

  function handleDelete() {
    if (typeof selectedId !== 'number') return
    if (!window.confirm('Supprimer ce thème ? Cette action est irréversible.')) return
    deleteMut.mutate(selectedId)
  }

  const rootThemes = themes.filter((t) => t.parent_id === null)
  const currentHasChildren =
    typeof selectedId === 'number' && themes.some((t) => t.parent_id === selectedId)

  const availableParents = themes.filter((t) => {
    if (typeof selectedId === 'number' && t.id === selectedId) return false
    return t.parent_id === null
  })

  const showPanel = selectedId !== null

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-(--color-text-primary)">Thèmes</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">
        Gérez les thèmes (2 niveaux maximum).
      </p>
      <div className="flex min-h-[500px] overflow-hidden rounded-lg border border-(--color-border)">
        <aside className="flex w-56 shrink-0 flex-col">
          <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-3">
            <h2 className="text-sm font-semibold text-(--color-text-primary)">Thèmes</h2>
            <button
              onClick={startNew}
              className="rounded-md p-1 text-(--color-text-placeholder) transition-colors hover:bg-(--color-bg-button) hover:text-(--color-text-primary)"
              title="Créer un thème"
              aria-label="Créer un nouveau thème"
            >
              <Plus size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {rootThemes.map((root) => (
              <div key={root.id}>
                <button
                  data-testid={`theme-item-${root.id}`}
                  onClick={() => selectTheme(root.id)}
                  className={[
                    'w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                    selectedId === root.id
                      ? 'bg-(--color-accent-bg) text-(--color-text-primary)'
                      : 'text-(--color-text-secondary) hover:bg-(--color-bg-button) hover:text-(--color-text-primary)',
                  ].join(' ')}
                >
                  {root.nom}
                </button>
                {themes
                  .filter((t) => t.parent_id === root.id)
                  .map((child) => (
                    <button
                      key={child.id}
                      data-testid={`theme-item-${child.id}`}
                      onClick={() => selectTheme(child.id)}
                      className={[
                        'w-full rounded-md py-1.5 pl-6 pr-3 text-left text-sm transition-colors',
                        selectedId === child.id
                          ? 'bg-(--color-accent-bg) text-(--color-text-primary)'
                          : 'text-(--color-text-secondary) hover:bg-(--color-bg-button) hover:text-(--color-text-primary)',
                      ].join(' ')}
                    >
                      {child.nom}
                    </button>
                  ))}
              </div>
            ))}
            {selectedId === 'new' && (
              <div className="rounded-md bg-(--color-accent-bg) px-3 py-2 text-sm font-medium text-(--color-text-placeholder)">
                Nouveau thème…
              </div>
            )}
          </nav>
        </aside>

        <div className="flex-1 overflow-y-auto border-l border-(--color-border)">
          {!showPanel ? (
            <div className="flex h-full items-center justify-center text-sm text-(--color-text-placeholder)">
              Sélectionnez un thème ou créez-en un nouveau
            </div>
          ) : (
            <div className="p-6">
              <div className="grid max-w-sm gap-4">
                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    htmlFor="theme-nom"
                  >
                    Nom <span className="text-(--color-danger-text)">*</span>
                  </label>
                  <input
                    id="theme-nom"
                    type="text"
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    placeholder="Ex : Philosophie"
                    aria-label="Nom du thème"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                  />
                  {errors.nom && (
                    <p className="mt-1 text-xs text-(--color-danger-text)">{errors.nom}</p>
                  )}
                </div>

                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    htmlFor="theme-parent"
                  >
                    Thème parent
                  </label>
                  <select
                    id="theme-parent"
                    value={form.parent_id}
                    onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
                    disabled={currentHasChildren}
                    aria-label="Thème parent"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action) disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">— Aucun (thème racine) —</option>
                    {availableParents.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nom}
                      </option>
                    ))}
                  </select>
                  {currentHasChildren && (
                    <p className="mt-1 text-xs text-(--color-text-placeholder)">
                      Ce thème a des sous-thèmes et ne peut pas être déplacé.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    htmlFor="theme-description"
                  >
                    Description
                  </label>
                  <textarea
                    id="theme-description"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    aria-label="Description du thème"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-(--color-border) pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md bg-(--color-action) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-action-hover) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                {typeof selectedId === 'number' && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 text-sm text-(--color-danger-text) hover:underline"
                  >
                    <Trash size={14} aria-hidden="true" />
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
