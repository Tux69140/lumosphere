import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_ADMIN, ROLE_EDITEUR } from '@/constants/roles'

export function RequireAtelier() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user || (user.role_id !== ROLE_ADMIN && user.role_id !== ROLE_EDITEUR))
    return <Navigate to="/" replace />
  return <Outlet />
}
