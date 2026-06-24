// src/features/auth/LoginPage.tsx
import { SignIn } from '@phosphor-icons/react'

export function LoginPage() {
  return (
    <div className="text-center">
      <SignIn size={48} className="mx-auto mb-4 text-(--color-text-placeholder)" />
      <h1 className="mb-2 text-xl font-bold text-(--color-text-primary)">Connexion</h1>
      <p className="text-sm text-(--color-text-secondary)">À venir (T09)</p>
    </div>
  )
}
