import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { AuthContext, type AuthUser } from '@/hooks/useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    apiClient
      .getMe()
      .then((res) => {
        if (res.status === 'ok' && res.data) setUser(res.data as AuthUser)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    apiClient.onSessionExpired(() => {
      setUser(null)
      toast.error('Session expirée, reconnectez-vous.')
      navigate('/login')
    })
  }, [navigate])

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    try {
      const res = await apiClient.login(email, password, remember)
      if (res.status !== 'ok') {
        return { ok: false, error: res.errors?.[0] ?? 'Connexion impossible.' }
      }
      const me = await apiClient.getMe()
      if (me.status === 'ok' && me.data) setUser(me.data as AuthUser)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Impossible de contacter le serveur.' }
    }
  }, [])

  const logout = useCallback(async () => {
    await apiClient.logout().catch(() => {})
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  )
}
