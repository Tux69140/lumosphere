import { useEffect, useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { z } from 'zod'
import { apiClient } from '@/services/api'

type Oeuvre = {
  id: number
  nom: string
  auteur_id: number
  auteur_nom: string | null
  abreviation: string | null
  url: string | null
  ref_libraire: string | null
  description: string | null
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
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([])
  const [auteurs, setAuteurs] = useState<Auteur[]>([])
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([apiClient.findOeuvres(), apiClient.findAuteurs()]).then(([ro, ra]) => {
      if (ro.status === 'ok') setOeuvres((ro.data ?? []) as Oeuvre[])
      else toast.error('Impossible de charger les œuvres.')
      if (ra.status === 'ok') setAuteurs((ra.data ?? []) as Auteur[])
      else toast.error('Impossible de charger les auteurs.')
    })
  }, [])

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
    setErrors({})
  }

  function startNew() {
    setSelectedId('new')
    setForm(emptyForm)
    setErrors({})
  }

  async function handleSave() {
    const parsed = schema.safeParse({
      ...form,
      auteur_id: form.auteur_id ? parseInt(form.auteur_id, 10) : undefined,
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
    setSaving(true)
    const payload = {
      nom: form.nom.trim(),
      auteur_id: parseInt(form.auteur_id, 10),
      abreviation: form.abreviation.trim() || null,
      url: form.url.trim() || null,
      ref_libraire: form.ref_libraire.trim() || null,
      description: form.description.trim() || null,
    }
    if (selectedId === 'new') {
      const r = await apiClient.createOeuvre(payload)
      setSaving(false)
      if (r.status !== 'ok') {
        toast.error((r as { errors?: string[] }).errors?.[0] ?? 'Création impossible.')
        return
      }
      const created = r.data as { id: number }
      const auteurNom = auteurs.find((a) => a.id === payload.auteur_id)?.nom ?? null
      const newOeuvre: Oeuvre = {
        id: created.id,
        auteur_nom: auteurNom,
        ...payload,
        abreviation: payload.abreviation ?? null,
        url: payload.url ?? null,
        ref_libraire: payload.ref_libraire ?? null,
        description: payload.description ?? null,
      }
      setOeuvres((prev) => [...prev, newOeuvre].sort((a, b) => a.nom.localeCompare(b.nom)))
      setSelectedId(created.id)
      toast.success(`Œuvre « ${payload.nom} » créée.`)
    } else if (typeof selectedId === 'number') {
      const r = await apiClient.updateOeuvre(selectedId, payload)
      setSaving(false)
      if (r.status !== 'ok') {
        toast.error((r as { errors?: string[] }).errors?.[0] ?? 'Modification impossible.')
        return
      }
      const auteurNom = auteurs.find((a) => a.id === payload.auteur_id)?.nom ?? null
      setOeuvres((prev) =>
        prev
          .map((o) =>
            o.id === selectedId
              ? {
                  ...o,
                  ...payload,
                  auteur_nom: auteurNom,
                  abreviation: payload.abreviation ?? null,
                  url: payload.url ?? null,
                  ref_libraire: payload.ref_libraire ?? null,
                  description: payload.description ?? null,
                }
              : o,
          )
          .sort((a, b) => a.nom.localeCompare(b.nom)),
      )
      toast.success('Modifications enregistrées.')
    }
  }

  async function handleDelete() {
    if (typeof selectedId !== 'number') return
    if (!window.confirm('Supprimer cette œuvre ? Cette action est irréversible.')) return
    const r = await apiClient.deleteOeuvre(selectedId)
    if (r.status !== 'ok') {
      toast.error((r as { errors?: string[] }).errors?.[0] ?? 'Suppression impossible.')
      return
    }
    setOeuvres((prev) => prev.filter((o) => o.id !== selectedId))
    setSelectedId(null)
    setForm(emptyForm)
    toast.success('Œuvre supprimée.')
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
