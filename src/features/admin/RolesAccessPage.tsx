import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { ROLE_ABO3, ROLE_ABO4 } from '@/constants/roles'

type Oeuvre = { id: number; nom: string; auteur_nom: string | null }

function RolePanel({
  roleId,
  label,
  oeuvres,
}: {
  roleId: number
  label: string
  oeuvres: Oeuvre[]
}) {
  const [selected, setSelected] = useState<number[]>([])

  useEffect(() => {
    apiClient.getRoleOeuvres(roleId).then((r) => {
      if (r.status === 'ok' && r.data) setSelected(r.data.oeuvre_ids)
    })
  }, [roleId])

  const toggle = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  async function save() {
    const res = await apiClient.setRoleOeuvres(roleId, selected)
    if (res.status === 'ok') toast.success(`Accès ${label} enregistrés.`)
    else toast.error(res.errors?.[0] ?? 'Enregistrement impossible.')
  }

  return (
    <section className="mb-6">
      <h2 className="mb-2 font-semibold text-(--color-text-primary)">{label}</h2>
      <div className="max-h-64 overflow-y-auto rounded-md border border-(--color-border) p-3">
        {oeuvres.map((o) => (
          <label key={o.id} className="flex items-center gap-2 py-0.5 text-sm">
            <input
              type="checkbox"
              aria-label={o.nom}
              checked={selected.includes(o.id)}
              onChange={() => toggle(o.id)}
            />
            <span>{o.nom}</span>
          </label>
        ))}
      </div>
      <button
        onClick={save}
        className="mt-2 rounded-md bg-(--color-accent) px-3 py-2 text-sm text-white"
      >
        Enregistrer {label}
      </button>
    </section>
  )
}

export function RolesAccessPage() {
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([])

  useEffect(() => {
    apiClient.findOeuvres().then((r) => {
      if (r.status === 'ok' && r.data) setOeuvres(r.data as Oeuvre[])
    })
  }, [])

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-(--color-text-primary)">Rôles et droits</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">
        Cochez les œuvres réservées à chaque rôle abonné. Les œuvres non cochées restent publiques
        (visibles des visiteurs).
      </p>
      <RolePanel roleId={ROLE_ABO3} label="Abo3" oeuvres={oeuvres} />
      <RolePanel roleId={ROLE_ABO4} label="Abo4" oeuvres={oeuvres} />
      <p className="text-xs text-(--color-text-placeholder)">
        Visiteur : voit tout le contenu public. Éditeur et Administrateur : voient tout.
      </p>
    </div>
  )
}
