// src/components/RequireRole.tsx
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/hooks/useAuth'

/**
 * Garde de route générique.
 * - chargement de la session : affiche un indicateur (évite le flash d'écran vide)
 * - non connecté → /login
 * - connecté mais rôle insuffisant → accueil /
 */
export function RequireRole({ roles }: { roles: number[] }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div
        role="status"
        aria-label="Chargement"
        className="flex justify-center p-8 text-(--color-text-secondary)"
      >
        Chargement…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!roles.includes(user.role_id)) return <Navigate to="/" replace />
  return <Outlet />
}
