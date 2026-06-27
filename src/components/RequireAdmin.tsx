// src/components/RequireAdmin.tsx
import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_ADMIN } from '@/constants/roles'

export function RequireAdmin() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user || user.role_id !== ROLE_ADMIN) return <Navigate to="/" replace />
  return <Outlet />
}
