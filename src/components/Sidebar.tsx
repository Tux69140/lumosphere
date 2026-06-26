// src/components/Sidebar.tsx
import { useLocation } from 'react-router'
import { CorpusFilters } from '@/components/CorpusFilters'
import { AdminNav } from '@/components/AdminNav'

export function Sidebar() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  return (
    <aside className="w-full shrink-0 border-b border-(--color-border) bg-(--color-bg-sidebar) p-4 lg:w-64 lg:border-b-0 lg:border-r">
      {isAdmin ? <AdminNav /> : <CorpusFilters />}
    </aside>
  )
}
