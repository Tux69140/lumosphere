import { createContext, useContext } from 'react'

export type AuthUser = {
  id: number
  prenom: string
  nom: string
  email: string
  role_id: number
  role_nom: string
}

export type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (
    email: string,
    password: string,
    remember: boolean,
  ) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>')
  }
  return ctx
}
