// src/features/admin/RoleList.tsx

import { Lock, Plus } from '@phosphor-icons/react'
import { ROLE_ADMIN } from '@/constants/roles'

type Role = { id: number; nom: string }

type Props = {
  roles: Role[]
  selectedId: number | 'new' | null
  onSelect: (id: number) => void
  onNew: () => void
}

export function RoleList({ roles, selectedId, onSelect, onNew }: Props) {
  return (
    <aside className="flex w-56 shrink-0 flex-col">
      <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-3">
        <h2 className="text-sm font-semibold text-(--color-text-primary)">Rôles</h2>
        <button
          onClick={onNew}
          className="rounded-md p-1 text-(--color-text-placeholder) transition-colors hover:bg-(--color-bg-button) hover:text-(--color-text-primary)"
          title="Créer un rôle"
          aria-label="Créer un nouveau rôle"
        >
          <Plus size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {roles.map((role) => (
          <button
            key={role.id}
            data-testid={`role-item-${role.id}`}
            onClick={() => onSelect(role.id)}
            className={[
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
              selectedId === role.id
                ? 'bg-(--color-accent-bg) font-medium text-(--color-text-primary)'
                : 'text-(--color-text-secondary) hover:bg-(--color-bg-button) hover:text-(--color-text-primary)',
              role.id === ROLE_ADMIN && selectedId !== role.id ? 'font-medium' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {role.id === ROLE_ADMIN && (
              <Lock size={13} className="shrink-0 text-(--color-accent)" aria-hidden="true" />
            )}
            {role.nom}
          </button>
        ))}
        {selectedId === 'new' && (
          <div className="flex items-center gap-2 rounded-md bg-(--color-accent-bg) px-3 py-2 text-sm font-medium text-(--color-text-placeholder)">
            Nouveau rôle…
          </div>
        )}
      </nav>
    </aside>
  )
}
