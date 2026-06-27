import { useEffect, useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { z } from 'zod'
import { apiClient } from '@/services/api'

type Auteur = {
  id: number
  nom: string
  site: string | null
  informations: string | null
}

const schema = z.object({
  nom: z.string().min(1, 'Le nom est requis.'),
  site: z.string().url('URL invalide.').or(z.literal('')).optional(),
  informations: z.string().optional(),
})

type FormState = { nom: string; site: string; informations: string }

const emptyForm: FormState = { nom: '', site: '', informations: '' }

export function AuteursPage() {
  const [auteurs, setAuteurs] = useState<Auteur[]>([])
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiClient.findAuteurs().then((r) => {
      if (r.status === 'ok') setAuteurs((r.data ?? []) as Auteur[])
      else toast.error('Impossible de charger les auteurs.')
    })
  }, [])

  function selectAuteur(id: number) {
    const found = auteurs.find((a) => a.id === id)
    if (!found) return
    setSelectedId(id)
    setForm({ nom: found.nom, site: found.site ?? '', informations: found.informations ?? '' })
    setErrors({})
  }

  function startNew() {
    setSelectedId('new')
    setForm(emptyForm)
    setErrors({})
  }

  async function handleSave() {
    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: Partial<FormState> = {}
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
      site: form.site.trim() || null,
      informations: form.informations.trim() || null,
    }
    if (selectedId === 'new') {
      const r = await apiClient.createAuteur(payload)
      setSaving(false)
      if (r.status !== 'ok') {
        toast.error((r as { errors?: string[] }).errors?.[0] ?? 'Création impossible.')
        return
      }
      const created = r.data as { id: number }
      const newAuteur: Auteur = {
        id: created.id,
        nom: payload.nom,
        site: payload.site ?? null,
        informations: payload.informations ?? null,
      }
      setAuteurs((prev) => [...prev, newAuteur].sort((a, b) => a.nom.localeCompare(b.nom)))
      setSelectedId(created.id)
      toast.success(`Auteur « ${payload.nom} » créé.`)
    } else if (typeof selectedId === 'number') {
      const r = await apiClient.updateAuteur(selectedId, payload)
      setSaving(false)
      if (r.status !== 'ok') {
        toast.error((r as { errors?: string[] }).errors?.[0] ?? 'Modification impossible.')
        return
      }
      setAuteurs((prev) =>
        prev
          .map((a) =>
            a.id === selectedId
              ? {
                  ...a,
                  ...payload,
                  site: payload.site ?? null,
                  informations: payload.informations ?? null,
                }
              : a,
          )
          .sort((a, b) => a.nom.localeCompare(b.nom)),
      )
      toast.success('Modifications enregistrées.')
    }
  }

  async function handleDelete() {
    if (typeof selectedId !== 'number') return
    if (!window.confirm('Supprimer cet auteur ? Cette action est irréversible.')) return
    const r = await apiClient.deleteAuteur(selectedId)
    if (r.status !== 'ok') {
      toast.error((r as { errors?: string[] }).errors?.[0] ?? 'Suppression impossible.')
      return
    }
    setAuteurs((prev) => prev.filter((a) => a.id !== selectedId))
    setSelectedId(null)
    setForm(emptyForm)
    toast.success('Auteur supprimé.')
  }

  const showPanel = selectedId !== null

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-(--color-text-primary)">Auteurs</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">
        Gérez les auteurs référencés dans le corpus.
      </p>
      <div className="flex min-h-[500px] overflow-hidden rounded-lg border border-(--color-border)">
        <aside className="flex w-56 shrink-0 flex-col">
          <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-3">
            <h2 className="text-sm font-semibold text-(--color-text-primary)">Auteurs</h2>
            <button
              onClick={startNew}
              className="rounded-md p-1 text-(--color-text-placeholder) transition-colors hover:bg-(--color-bg-button) hover:text-(--color-text-primary)"
              title="Créer un auteur"
              aria-label="Créer un nouvel auteur"
            >
              <Plus size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {auteurs.map((a) => (
              <button
                key={a.id}
                data-testid={`auteur-item-${a.id}`}
                onClick={() => selectAuteur(a.id)}
                className={[
                  'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                  selectedId === a.id
                    ? 'bg-(--color-accent-bg) font-medium text-(--color-text-primary)'
                    : 'text-(--color-text-secondary) hover:bg-(--color-bg-button) hover:text-(--color-text-primary)',
                ].join(' ')}
              >
                {a.nom}
              </button>
            ))}
            {selectedId === 'new' && (
              <div className="rounded-md bg-(--color-accent-bg) px-3 py-2 text-sm font-medium text-(--color-text-placeholder)">
                Nouvel auteur…
              </div>
            )}
          </nav>
        </aside>

        <div className="flex-1 overflow-y-auto border-l border-(--color-border)">
          {!showPanel ? (
            <div className="flex h-full items-center justify-center text-sm text-(--color-text-placeholder)">
              Sélectionnez un auteur ou créez-en un nouveau
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-4 max-w-sm">
                <label
                  className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                  htmlFor="auteur-nom"
                >
                  Nom <span className="text-(--color-danger-text)">*</span>
                </label>
                <input
                  id="auteur-nom"
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                  placeholder="Ex : Simone de Beauvoir"
                  aria-label="Nom de l'auteur"
                  className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                />
                {errors.nom && (
                  <p className="mt-1 text-xs text-(--color-danger-text)">{errors.nom}</p>
                )}
              </div>

              <div className="mb-4 max-w-sm">
                <label
                  className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                  htmlFor="auteur-site"
                >
                  Site web
                </label>
                <input
                  id="auteur-site"
                  type="url"
                  value={form.site}
                  onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                  placeholder="https://…"
                  aria-label="Site web de l'auteur"
                  className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                />
                {errors.site && (
                  <p className="mt-1 text-xs text-(--color-danger-text)">{errors.site}</p>
                )}
              </div>

              <div className="mb-6 max-w-sm">
                <label
                  className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                  htmlFor="auteur-informations"
                >
                  Informations
                </label>
                <textarea
                  id="auteur-informations"
                  value={form.informations}
                  onChange={(e) => setForm((f) => ({ ...f, informations: e.target.value }))}
                  rows={4}
                  aria-label="Informations sur l'auteur"
                  className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                />
              </div>

              <div className="flex items-center justify-between border-t border-(--color-border) pt-4">
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
