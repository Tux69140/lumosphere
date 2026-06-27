import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'

type Etat = {
  id: number
  nom: string
  code: string
  couleur: string
  est_modifiable: number
}

export function EtatsPage() {
  const [etats, setEtats] = useState<Etat[]>([])
  const [editId, setEditId] = useState<number | null>(null)
  const [editNom, setEditNom] = useState('')
  const [editCouleur, setEditCouleur] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiClient.findEtats().then((r) => {
      if (r.status === 'ok') setEtats((r.data ?? []) as Etat[])
      else toast.error('Impossible de charger les états.')
    })
  }, [])

  function startEdit(etat: Etat) {
    if (!etat.est_modifiable) return
    setEditId(etat.id)
    setEditNom(etat.nom)
    setEditCouleur(etat.couleur)
  }

  function cancelEdit() {
    setEditId(null)
  }

  async function handleSave(id: number) {
    const nom = editNom.trim()
    if (!nom) {
      toast.error('Le nom est requis.')
      return
    }
    setSaving(true)
    const r = await apiClient.updateEtat(id, { nom, couleur: editCouleur })
    setSaving(false)
    if (r.status !== 'ok') {
      toast.error((r as { errors?: string[] }).errors?.[0] ?? 'Modification impossible.')
      return
    }
    setEtats((prev) => prev.map((e) => (e.id === id ? { ...e, nom, couleur: editCouleur } : e)))
    setEditId(null)
    toast.success('État mis à jour.')
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-(--color-text-primary)">États</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">
        Gérez les états des citations. Les états système (non modifiables) sont verrouillés.
      </p>

      <div className="rounded-lg border border-(--color-border) divide-y divide-(--color-border)">
        {etats.map((etat) => (
          <div key={etat.id} className="px-4 py-3">
            {editId === etat.id ? (
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className="h-4 w-4 shrink-0 rounded-full border border-(--color-border)"
                  style={{ backgroundColor: editCouleur }}
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  aria-label="Nom de l'état"
                  className="rounded-md border border-(--color-border) bg-(--color-bg-field) px-2 py-1 text-sm text-(--color-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)"
                />
                <label className="flex items-center gap-1.5 text-sm text-(--color-text-secondary)">
                  Couleur
                  <input
                    type="color"
                    value={editCouleur}
                    onChange={(e) => setEditCouleur(e.target.value)}
                    aria-label="Couleur de l'état"
                    className="h-7 w-10 cursor-pointer rounded border border-(--color-border) bg-transparent p-0.5"
                  />
                </label>
                <button
                  onClick={() => handleSave(etat.id)}
                  disabled={saving}
                  className="rounded-md bg-(--color-action) px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-(--color-action-hover) disabled:opacity-50"
                >
                  OK
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-sm text-(--color-text-secondary) hover:underline"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 shrink-0 rounded-full border border-(--color-border)"
                    style={{ backgroundColor: etat.couleur }}
                    aria-hidden="true"
                  />
                  <div>
                    <span className="text-sm font-medium text-(--color-text-primary)">
                      {etat.nom}
                    </span>
                    <span className="ml-2 text-xs text-(--color-text-placeholder)">
                      {etat.code}
                    </span>
                  </div>
                </div>
                {etat.est_modifiable ? (
                  <button
                    onClick={() => startEdit(etat)}
                    className="text-sm text-(--color-action) hover:underline"
                  >
                    Modifier
                  </button>
                ) : (
                  <span className="text-xs text-(--color-text-placeholder)">Système</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
