// src/features/admin/RolesAccessPage.tsx

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { ROLE_ADMIN, ROLE_VISITEUR } from '@/constants/roles'
import { RoleList } from './RoleList'
import { RoleDetail } from './RoleDetail'
import type { RoleDetailData } from './RoleDetail'

type Role = { id: number; nom: string }
type Oeuvre = { id: number; nom: string; auteur_nom: string | null }

export function RolesAccessPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([])
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
  const [detail, setDetail] = useState<RoleDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    Promise.all([apiClient.findRoles(), apiClient.findOeuvres()]).then(([rr, ro]) => {
      if (rr.status === 'ok') setRoles((rr.data ?? []) as Role[])
      else toast.error('Impossible de charger les rôles.')
      if (ro.status === 'ok') setOeuvres((ro.data ?? []) as Oeuvre[])
      else toast.error('Impossible de charger les œuvres.')
    })
  }, [])

  async function selectRole(id: number) {
    setSelectedId(id)
    setDetailLoading(true)
    setDetail(null) // clear to trigger remount with fresh state on load
    const [rr, ro] = await Promise.all([
      apiClient.getRoleWithPermissions(id),
      apiClient.getRoleOeuvres(id),
    ])
    setDetailLoading(false)
    if (rr.status !== 'ok') {
      toast.error('Impossible de charger le rôle.')
      return
    }
    const role = rr.data as { id: number; nom: string; permissions: { id: number }[] }
    const permIds = role.permissions.map((p) => p.id)
    const oeuvreIds = (ro.data?.oeuvre_ids ?? []) as number[]
    const hasReadAll = permIds.includes(2) // corpus.read_all
    setDetail({
      id,
      nom: role.nom,
      permissionIds: permIds,
      oeuvreIds,
      isProtected: id === ROLE_ADMIN,
      showOeuvres: permIds.includes(1) && !hasReadAll && id !== ROLE_VISITEUR,
    })
  }

  function startNewRole() {
    setSelectedId('new')
    setDetail({
      id: null,
      nom: '',
      permissionIds: [1], // corpus.read pré-coché
      oeuvreIds: [],
      isProtected: false,
      showOeuvres: true,
    })
  }

  async function saveRole(data: { nom: string; permissionIds: number[]; oeuvreIds: number[] }) {
    if (!detail) return

    if (detail.id === null) {
      // Création
      const r = await apiClient.createRole(data.nom, data.permissionIds)
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Création impossible.')
        return
      }
      const newRole = r.data as { id: number; nom: string }
      setRoles((prev) => [...prev, newRole])
      await selectRole(newRole.id)
      toast.success(`Rôle « ${newRole.nom} » créé.`)
      return
    }

    // Mise à jour
    const id = detail.id
    const [rn, rp, ro] = await Promise.all([
      apiClient.updateRole(id, data.nom),
      apiClient.updateRolePermissions(id, data.permissionIds),
      detail.showOeuvres
        ? apiClient.setRoleOeuvres(id, data.oeuvreIds)
        : Promise.resolve({ status: 'ok' as const, data: null, errors: [] as string[] }),
    ])
    if (rn.status !== 'ok') {
      toast.error(rn.errors?.[0] ?? 'Renommage impossible.')
      return
    }
    if (rp.status !== 'ok') {
      toast.error(rp.errors?.[0] ?? 'Mise à jour permissions impossible.')
      return
    }
    if (ro.status !== 'ok') {
      toast.error((ro as { errors?: string[] }).errors?.[0] ?? 'Mise à jour œuvres impossible.')
      return
    }
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, nom: data.nom } : r)))
    await selectRole(id)
    toast.success('Modifications enregistrées.')
  }

  async function deleteRole(id: number) {
    if (!window.confirm('Supprimer ce rôle ? Cette action est irréversible.')) return
    const r = await apiClient.deleteRole(id)
    if (r.status !== 'ok') {
      toast.error(r.errors?.[0] ?? 'Suppression impossible.')
      return
    }
    setRoles((prev) => prev.filter((role) => role.id !== id))
    setSelectedId(null)
    setDetail(null)
    toast.success('Rôle supprimé.')
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-(--color-text-primary)">Rôles et droits</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">
        Gérez les rôles, leurs permissions et leurs accès aux œuvres réservées.
      </p>
      <div className="flex min-h-[500px] overflow-hidden rounded-lg border border-(--color-border)">
        <RoleList
          roles={roles}
          selectedId={selectedId}
          onSelect={selectRole}
          onNew={startNewRole}
        />
        <div className="flex-1 overflow-y-auto border-l border-(--color-border)">
          <RoleDetail
            key={detail ? String(detail.id ?? 'new') : 'loading'}
            detail={detail}
            loading={detailLoading}
            oeuvres={oeuvres}
            onSave={saveRole}
            onDelete={deleteRole}
          />
        </div>
      </div>
    </div>
  )
}
