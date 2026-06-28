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
      <aside className="w-full shrink-0 border-b border-(--color-border) bg-(--color-bg-sidebar) lg:w-80 lg:border-b-0 lg:border-r">
        <div className="p-4 lg:sticky lg:top-16 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
          <AdminNav />
        </div>
      </aside>
    )
  }

  return (
    <aside
      id="corpus-filters"
      className={`w-full shrink-0 border-b border-(--color-border) bg-(--color-bg-sidebar) lg:block lg:w-80 lg:border-b-0 lg:border-r ${
        filtersOpen ? 'block' : 'hidden'
      }`}
    >
      <div className="p-4 lg:sticky lg:top-16 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
        <CorpusFilters />
      </div>
    </aside>
  )
}
