import { type ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'

const ALLOWED_ROLES = [1, 2] // Administrateur, Éditeur

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user || !ALLOWED_ROLES.includes(user.role_id)) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
