import { useCallback, useEffect, useState } from 'react'
import { Plus, PencilSimple, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { UserFormModal } from './UserFormModal'

type Role = { id: number; nom: string }
type UserRow = { id: number; prenom: string; nom: string; email: string; role_id: number }

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)

  const load = useCallback(() => {
    apiClient.findUsers().then((r) => {
      if (r.status === 'ok') setUsers((r.data ?? []) as UserRow[])
    })
  }, [])

  useEffect(() => {
    load()
    apiClient.findRoles().then((r) => {
      if (r.status === 'ok') setRoles((r.data ?? []) as Role[])
    })
  }, [load])

  const roleName = (id: number) => roles.find((r) => r.id === id)?.nom ?? '—'

  async function handleDelete(u: UserRow) {
    if (!window.confirm(`Supprimer ${u.prenom} ${u.nom} ?`)) return
    const res = await apiClient.deleteUser(u.id)
    if (res.status === 'ok') {
      toast.success('Utilisateur supprimé.')
      load()
    } else {
      toast.error(res.errors?.[0] ?? 'Suppression impossible.')
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-(--color-text-primary)">Utilisateurs</h1>
        <button
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
          className="flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-2 text-sm text-white"
        >
          <Plus size={16} /> Ajouter un utilisateur
        </button>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-(--color-border) text-left text-(--color-text-secondary)">
            <th className="py-2">Prénom</th>
            <th>Nom</th>
            <th>Email</th>
            <th>Rôle</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-(--color-border)">
              <td className="py-2">{u.prenom}</td>
              <td>{u.nom}</td>
              <td>{u.email}</td>
              <td>{roleName(u.role_id)}</td>
              <td className="text-right">
                <button
                  aria-label={`Modifier ${u.email}`}
                  onClick={() => {
                    setEditing(u)
                    setModalOpen(true)
                  }}
                  className="mr-2 text-(--color-text-secondary) hover:text-(--color-text-primary)"
                >
                  <PencilSimple size={18} />
                </button>
                <button
                  aria-label={`Supprimer ${u.email}`}
                  onClick={() => handleDelete(u)}
                  className="text-(--color-danger-text)"
                >
                  <Trash size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalOpen && (
        <UserFormModal
          open={modalOpen}
          user={editing}
          roles={roles}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            toast.success('Utilisateur enregistré.')
            load()
          }}
        />
      )}
    </div>
  )
}
