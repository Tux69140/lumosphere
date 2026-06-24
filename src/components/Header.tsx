// src/components/Header.tsx
import { useState } from 'react'
import { Link } from 'react-router'
import { SunHorizon, List, X, SignIn } from '@phosphor-icons/react'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-(--color-border-header) bg-(--color-bg-header) px-4 py-3">
      <Link to="/" className="flex items-center gap-2 no-underline">
        <SunHorizon size={28} weight="fill" className="text-(--color-accent)" />
        <span className="text-lg font-bold text-(--color-text-header)">Lumosphère</span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden items-center gap-2 md:flex">
        <ThemeToggle />
        <Link
          to="/login"
          className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-(--color-link-header) hover:bg-(--color-bg-button) transition-colors"
        >
          <SignIn size={18} />
          <span>Connexion</span>
        </Link>
      </nav>

      {/* Mobile burger */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="rounded-md p-2 text-(--color-icon-header) md:hidden"
        aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
      >
        {menuOpen ? <X size={24} /> : <List size={24} />}
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute left-0 right-0 top-full border-b border-(--color-border-header) bg-(--color-bg-header) p-4 md:hidden">
          <div className="flex flex-col gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-(--color-link-header) hover:bg-(--color-bg-button)"
            >
              <SignIn size={18} />
              <span>Connexion</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
