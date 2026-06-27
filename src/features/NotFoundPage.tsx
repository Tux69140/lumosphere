// src/features/NotFoundPage.tsx
import { Link } from 'react-router'
import { Warning } from '@phosphor-icons/react'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <Warning size={48} className="mb-4 text-(--color-warning)" />
      <h1 className="mb-2 text-xl font-bold text-(--color-text-primary)">Page introuvable</h1>
      <Link to="/" className="text-sm text-(--color-action) hover:text-(--color-action-hover)">
        Retour à l'accueil
      </Link>
    </div>
  )
}
