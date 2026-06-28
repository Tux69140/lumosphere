import { NavLink } from 'react-router'
import {
  Users,
  ShieldCheck,
  UserList,
  Books,
  TreeStructure,
  Tag,
  Palette,
  Smiley,
  ListBullets,
  Robot,
} from '@phosphor-icons/react'

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
        <Users size={18} aria-hidden="true" /> Utilisateurs
      </NavLink>
      <NavLink to="/admin/roles" className={linkClass}>
        <ShieldCheck size={18} aria-hidden="true" /> Rôles et droits
      </NavLink>
      <NavLink to="/admin/auteurs" className={linkClass}>
        <UserList size={18} aria-hidden="true" /> Auteurs
      </NavLink>
      <NavLink to="/admin/oeuvres" className={linkClass}>
        <Books size={18} aria-hidden="true" /> Œuvres
      </NavLink>
      <NavLink to="/admin/themes" className={linkClass}>
        <TreeStructure size={18} aria-hidden="true" /> Thèmes
      </NavLink>
      <NavLink to="/admin/mots-cles" className={linkClass}>
        <Tag size={18} aria-hidden="true" /> Mots-clés
      </NavLink>
      <NavLink to="/admin/etats" className={linkClass}>
        <Palette size={18} aria-hidden="true" /> États
      </NavLink>
      <NavLink to="/admin/emojis" className={linkClass}>
        <Smiley size={18} aria-hidden="true" /> Emojis
      </NavLink>
      <NavLink to="/admin/citations" className={linkClass}>
        <ListBullets size={18} aria-hidden="true" /> Entrées
      </NavLink>
      <NavLink to="/admin/ia" className={linkClass}>
        <Robot size={18} aria-hidden="true" /> IA
      </NavLink>
    </nav>
  )
}
