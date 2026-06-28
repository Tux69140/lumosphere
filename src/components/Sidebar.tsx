// src/components/Sidebar.tsx
import { useLocation } from 'react-router'
import { CorpusFilters } from '@/components/CorpusFilters'
import { AdminNav } from '@/components/AdminNav'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'

export function Sidebar() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  const { filtersOpen } = useCorpusSearch()

  if (isAdmin) {
    return (
      <aside className="w-full shrink-0 border-b border-(--color-border) bg-(--color-bg-sidebar) p-4 lg:sticky lg:top-16 lg:w-80 lg:border-b-0 lg:border-r lg:min-h-[calc(100vh-4rem)] lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
        <AdminNav />
      </aside>
    )
  }

  // Toujours visible sur desktop ; sur mobile, ouvert/fermé via le bouton « Filtres » du header.
  return (
    <aside
      id="corpus-filters"
      className={`w-full shrink-0 border-b border-(--color-border) bg-(--color-bg-sidebar) p-4 lg:sticky lg:top-16 lg:block lg:w-80 lg:border-b-0 lg:border-r lg:min-h-[calc(100vh-4rem)] lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto ${
        filtersOpen ? 'block' : 'hidden'
      }`}
    >
      <CorpusFilters />
    </aside>
  )
}
