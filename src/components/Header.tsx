// src/components/Header.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { SunHorizon, List, X, SignIn, SignOut, GearSix } from '@phosphor-icons/react'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_ADMIN } from '@/constants/roles'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user !== null && user.role_id === ROLE_ADMIN

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    navigate('/')
  }

  function renderActions(showLabels = false) {
    const labelClass = showLabels ? '' : 'hidden sm:inline'
    return (
      <>
        <ThemeToggle />
        {isAdmin && (
          <Link
            to="/admin"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-(--color-link-header) hover:bg-(--color-bg-button) transition-colors"
          >
            <GearSix size={18} aria-hidden="true" />
            <span className={labelClass}>Admin</span>
          </Link>
        )}
        {user ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-(--color-link-header) hover:bg-(--color-bg-button) transition-colors"
          >
            <SignOut size={18} aria-hidden="true" />
            <span className={labelClass}>Déconnexion</span>
          </button>
        ) : (
          <Link
            to="/login"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-(--color-link-header) hover:bg-(--color-bg-button) transition-colors"
          >
            <SignIn size={18} aria-hidden="true" />
            <span className={labelClass}>Connexion</span>
          </Link>
        )}
      </>
    )
  }

  return (
    <header className="sticky top-0 z-50 border-b border-(--color-border-header) bg-(--color-bg-header) px-4 shadow-sm lg:px-6">
      <div className="flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <SunHorizon size={28} weight="fill" className="text-(--color-accent)" />
          <span className="text-lg font-bold text-(--color-text-header)">Lumosphère</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <div className="h-6 w-px bg-(--color-border-header)" />
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-(--color-link-header) hover:bg-(--color-bg-button) transition-colors"
            >
              <GearSix size={18} aria-hidden="true" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-(--color-link-header) hover:bg-(--color-bg-button) transition-colors"
            >
              <SignOut size={18} aria-hidden="true" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-(--color-link-header) hover:bg-(--color-bg-button) transition-colors"
            >
              <SignIn size={18} aria-hidden="true" />
              <span className="hidden sm:inline">Connexion</span>
            </Link>
          )}
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-md p-2 text-(--color-icon-header) md:hidden"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          {menuOpen ? <X size={24} /> : <List size={24} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-b border-(--color-border-header) bg-(--color-bg-header) p-4 md:hidden">
          <div className="flex flex-col gap-3">{renderActions(true)}</div>
        </div>
      )}
    </header>
  )
}
