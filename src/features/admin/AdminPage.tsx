// src/features/admin/AdminPage.tsx
import { GearSix } from '@phosphor-icons/react'

export function AdminPage() {
  return (
    <div className="text-center">
      <GearSix size={48} className="mx-auto mb-4 text-(--color-text-placeholder)" />
      <h1 className="mb-2 text-xl font-bold text-(--color-text-primary)">Administration</h1>
      <p className="text-sm text-(--color-text-secondary)">À venir (T14)</p>
    </div>
  )
}
