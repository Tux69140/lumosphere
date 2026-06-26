// src/components/AdminNav.tsx
import { NavLink } from 'react-router'
import { Users, ShieldCheck } from '@phosphor-icons/react'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-(--color-bg-button) text-(--color-text-primary)'
      : 'text-(--color-text-secondary) hover:bg-(--color-bg-button)'
  }`

export function AdminNav() {
  return (
    <nav className="flex flex-col gap-1">
      <NavLink to="/admin/utilisateurs" className={linkClass}>
        <Users size={18} /> Utilisateurs
      </NavLink>
      <NavLink to="/admin/roles" className={linkClass}>
        <ShieldCheck size={18} /> Rôles et droits
      </NavLink>
    </nav>
  )
}
