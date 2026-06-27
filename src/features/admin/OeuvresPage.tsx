import { useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'
import { useOeuvres, useAuteurs, useCollectSources } from '@/services/referenceQueries'

type Oeuvre = {
  id: number
  nom: string
  auteur_id: number
  auteur_nom: string | null
  abreviation: string | null
  url: string | null
  ref_libraire: string | null
  description: string | null
  source_id: number | null
  source_label: string | null
}

type Auteur = { id: number; nom: string }

const schema = z.object({
  nom: z.string().min(1, 'Le nom est requis.'),
  auteur_id: z.number().int().positive("L'auteur est requis."),
  abreviation: z.string().optional(),
  url: z.string().url('URL invalide.').or(z.literal('')).optional(),
  ref_libraire: z.string().optional(),
  description: z.string().optional(),
})

type FormState = {
  nom: string
  auteur_id: string
  abreviation: string
  url: string
  ref_libraire: string
  description: string
}

const emptyForm: FormState = {
  nom: '',
  auteur_id: '',
  abreviation: '',
  url: '',
  ref_libraire: '',
  description: '',
}

export function OeuvresPage() {
  const qc = useQueryClient()
  const { data: oeuvres = [] } = useOeuvres() as { data?: Oeuvre[] }
  const { data: auteurs = [] } = useAuteurs() as { data?: Auteur[] }
  const { data: sources = [] } = useCollectSources()

  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null)

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.createOeuvre(payload),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Création impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.oeuvres })
      setSelectedId((r.data as { id: number }).id)
      toast.success('Œuvre créée.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })
  const updateMut = useMutation({
    mutationFn: (vars: { id: number; payload: Record<string, unknown> }) =>
      apiClient.updateOeuvre(vars.id, vars.payload),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Modification impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.oeuvres })
      toast.success('Modifications enregistrées.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient.deleteOeuvre(id),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Suppression impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.oeuvres })
      setSelectedId(null)
      setForm(emptyForm)
      toast.success('Œuvre supprimée.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })
  const linkMut = useMutation({
    mutationFn: (vars: { oeuvreId: number; sourceId: number | null }) =>
      apiClient.linkOeuvreSource(vars.oeuvreId, vars.sourceId),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Association impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.oeuvres })
      qc.invalidateQueries({ queryKey: queryKeys.collectSources })
      toast.success('Source associée.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })

  const saving = createMut.isPending || updateMut.isPending

  function selectOeuvre(id: number) {
    const found = oeuvres.find((o) => o.id === id)
    if (!found) return
    setSelectedId(id)
    setForm({
      nom: found.nom,
      auteur_id: String(found.auteur_id),
      abreviation: found.abreviation ?? '',
      url: found.url ?? '',
      ref_libraire: found.ref_libraire ?? '',
      description: found.description ?? '',
    })
    setSelectedSourceId(found.source_id)
    setErrors({})
  }

  function startNew() {
    setSelectedId('new')
    setForm(emptyForm)
    setSelectedSourceId(null)
    setErrors({})
  }

  async function handleSave() {
    const parsed = schema.safeParse({
      ...form,
      auteur_id: form.auteur_id ? parseInt(form.auteur_id, 10) : undefined,
    })
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {}
      for (const issue of parsed.error.issues)
        fieldErrors[issue.path[0] as keyof FormState] = issue.message
      setErrors(fieldErrors)
      return
    }
    const payload = {
      nom: form.nom.trim(),
      auteur_id: parseInt(form.auteur_id, 10),
      abreviation: form.abreviation.trim() || null,
      url: form.url.trim() || null,
      ref_libraire: form.ref_libraire.trim() || null,
      description: form.description.trim() || null,
    }
    if (selectedId === 'new') createMut.mutate(payload)
    else if (typeof selectedId === 'number') updateMut.mutate({ id: selectedId, payload })
  }

  function handleDelete() {
    if (typeof selectedId !== 'number') return
    if (!window.confirm('Supprimer cette œuvre ? Cette action est irréversible.')) return
    deleteMut.mutate(selectedId)
  }

  function handleSourceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (typeof selectedId !== 'number') return
    const sourceId = e.target.value ? parseInt(e.target.value, 10) : null
    setSelectedSourceId(sourceId)
    linkMut.mutate({ oeuvreId: selectedId, sourceId })
  }

  const showPanel = selectedId !== null

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-(--color-text-primary)">Œuvres</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">Gérez les œuvres du corpus.</p>
      <div className="flex min-h-[500px] overflow-hidden rounded-lg border border-(--color-border)">
        <aside className="flex w-64 shrink-0 flex-col">
          <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-3">
            <h2 className="text-sm font-semibold text-(--color-text-primary)">Œuvres</h2>
            <button
              onClick={startNew}
              className="rounded-md p-1 text-(--color-text-placeholder) transition-colors hover:bg-(--color-bg-button) hover:text-(--color-text-primary)"
              title="Créer une œuvre"
              aria-label="Créer une nouvelle œuvre"
            >
              <Plus size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {oeuvres.map((o) => (
              <button
                key={o.id}
                data-testid={`oeuvre-item-${o.id}`}
                onClick={() => selectOeuvre(o.id)}
                className={[
                  'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                  selectedId === o.id
                    ? 'bg-(--color-accent-bg) font-medium text-(--color-text-primary)'
                    : 'text-(--color-text-secondary) hover:bg-(--color-bg-button) hover:text-(--color-text-primary)',
                ].join(' ')}
              >
                <span className="block truncate">{o.nom}</span>
                {o.auteur_nom && (
                  <span className="block truncate text-xs text-(--color-text-placeholder)">
                    {o.auteur_nom}
                  </span>
                )}
              </button>
            ))}
            {selectedId === 'new' && (
              <div className="rounded-md bg-(--color-accent-bg) px-3 py-2 text-sm font-medium text-(--color-text-placeholder)">
                Nouvelle œuvre…
              </div>
            )}
          </nav>
        </aside>

        <div className="flex-1 overflow-y-auto border-l border-(--color-border)">
          {!showPanel ? (
            <div className="flex h-full items-center justify-center text-sm text-(--color-text-placeholder)">
              Sélectionnez une œuvre ou créez-en une nouvelle
            </div>
          ) : (
            <div className="p-6">
              <div className="grid max-w-lg gap-4">
                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    htmlFor="oeuvre-nom"
                  >
                    Titre <span className="text-(--color-danger-text)">*</span>
                  </label>
                  <input
                    id="oeuvre-nom"
                    type="text"
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    placeholder="Ex : Le Deuxième Sexe"
                    aria-label="Titre de l'œuvre"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                  />
                  {errors.nom && (
                    <p className="mt-1 text-xs text-(--color-danger-text)">{errors.nom}</p>
                  )}
                </div>

                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    htmlFor="oeuvre-auteur"
                  >
                    Auteur <span className="text-(--color-danger-text)">*</span>
                  </label>
                  <select
                    id="oeuvre-auteur"
                    value={form.auteur_id}
                    onChange={(e) => setForm((f) => ({ ...f, auteur_id: e.target.value }))}
                    aria-label="Auteur de l'œuvre"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                  >
                    <option value="">— Choisir un auteur —</option>
                    {auteurs.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nom}
                      </option>
                    ))}
                  </select>
                  {errors.auteur_id && (
                    <p className="mt-1 text-xs text-(--color-danger-text)">{errors.auteur_id}</p>
                  )}
                </div>

                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    htmlFor="oeuvre-abreviation"
                  >
                    Abréviation
                  </label>
                  <input
                    id="oeuvre-abreviation"
                    type="text"
                    value={form.abreviation}
                    onChange={(e) => setForm((f) => ({ ...f, abreviation: e.target.value }))}
                    aria-label="Abréviation de l'œuvre"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                  />
                </div>

                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    htmlFor="oeuvre-url"
                  >
                    URL
                  </label>
                  <input
                    id="oeuvre-url"
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://…"
                    aria-label="URL de l'œuvre"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                  />
                  {errors.url && (
                    <p className="mt-1 text-xs text-(--color-danger-text)">{errors.url}</p>
                  )}
                </div>

                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    htmlFor="oeuvre-ref"
                  >
                    Réf. libraire
                  </label>
                  <input
                    id="oeuvre-ref"
                    type="text"
                    value={form.ref_libraire}
                    onChange={(e) => setForm((f) => ({ ...f, ref_libraire: e.target.value }))}
                    aria-label="Référence libraire"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                  />
                </div>

                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    htmlFor="oeuvre-description"
                  >
                    Description
                  </label>
                  <textarea
                    id="oeuvre-description"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    aria-label="Description de l'œuvre"
                    className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                  />
                </div>

                {typeof selectedId === 'number' && (
                  <div className="border-t border-(--color-border) pt-4">
                    <label
                      className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                      htmlFor="oeuvre-source"
                    >
                      Source de collecte
                    </label>
                    <select
                      id="oeuvre-source"
                      value={selectedSourceId ?? ''}
                      onChange={handleSourceChange}
                      disabled={linkMut.isPending}
                      aria-label="Source de collecte"
                      className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action) disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">— Aucune —</option>
                      {sources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label} — {s.source_type}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
