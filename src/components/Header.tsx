// src/components/Header.tsx
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { SunHorizon, List, X, SignIn, SignOut, GearSix, Funnel, Heart } from '@phosphor-icons/react'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { useCorpusSearchOptional } from '@/features/corpus/useCorpusSearch'
import { ROLE_ADMIN } from '@/constants/roles'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const { favoriteIds } = useFavorites()
  const hasFavorites = favoriteIds.size > 0
  const navigate = useNavigate()
  const location = useLocation()
  const { pathname } = location
  const isAdmin = user !== null && user.role_id === ROLE_ADMIN

  // Bouton « Filtres » mobile : seulement sur la vue corpus (contexte présent, hors admin).
  const corpus = useCorpusSearchOptional()
  const showFilters = corpus !== null && !pathname.startsWith('/admin')
  const activeFilters = corpus
    ? (corpus.query.trim() !== '' ? 1 : 0) +
      corpus.selectedOeuvreIds.length +
      corpus.selectedThemeIds.length
    : 0

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    navigate('/')
  }

  function renderActions({
    showLabels = false,
    withDivider = false,
  }: { showLabels?: boolean; withDivider?: boolean } = {}) {
    const labelClass = showLabels ? '' : 'hidden sm:inline'
    return (
      <>
        <ThemeToggle />
        {withDivider && <div className="h-6 w-px bg-(--color-border-header)" />}
        <Link
          to="/?favoris=1"
          onClick={() => setMenuOpen(false)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-(--color-bg-button) ${
            hasFavorites ? 'text-(--color-accent)' : 'text-(--color-link-header)'
          }`}
          aria-label="Mes favoris"
        >
          <Heart size={18} weight={hasFavorites ? 'fill' : 'regular'} aria-hidden="true" />
          <span className={labelClass}>Favoris</span>
        </Link>
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
            state={{ from: { pathname, search: location.search, hash: location.hash } }}
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

        <div className="flex items-center gap-2">
          {/* Bouton « Filtres » à gauche du menu (mobile/tablette) — ouvre le panneau de la sidebar. */}
          {showFilters && (
            <button
              type="button"
              onClick={corpus!.toggleFilters}
              aria-expanded={corpus!.filtersOpen}
              aria-controls="corpus-filters"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-(--color-link-header) transition-colors hover:bg-(--color-bg-button) lg:hidden"
            >
              <Funnel size={18} aria-hidden="true" />
              <span>Filtres</span>
              {activeFilters > 0 && (
                <span className="rounded-full bg-(--color-tag-bg) px-1.5 text-xs font-medium text-(--color-tag-text)">
                  {activeFilters}
                </span>
              )}
            </button>
          )}

          <nav className="hidden items-center gap-2 md:flex">
            {renderActions({ withDivider: true })}
          </nav>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-2 text-(--color-icon-header) md:hidden"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {menuOpen ? <X size={24} /> : <List size={24} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-b border-(--color-border-header) bg-(--color-bg-header) p-4 md:hidden">
          <div className="flex flex-col gap-3">{renderActions({ showLabels: true })}</div>
        </div>
      )}
    </header>
  )
}
