// src/components/Sidebar.tsx
import { useLocation } from 'react-router'
import { CorpusFilters } from '@/components/CorpusFilters'
import { AdminNav } from '@/components/AdminNav'
import { useCorpusSearch } from '@/features/corpus/useCorpusSearch'
import lulumineuseLogo from '@/assets/lulumineuse-logo.png'

export function Sidebar() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  const { filtersOpen, reset, hasActiveFilters } = useCorpusSearch()

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
      <div className="flex flex-col lg:sticky lg:top-16 lg:max-h-[calc(100vh-4rem)]">
        <div className="flex-grow overflow-y-auto p-4">
          <CorpusFilters />
        </div>
        <div className="flex-shrink-0 border-t border-(--color-border) p-4">
          <button
            type="button"
            onClick={reset}
            disabled={!hasActiveFilters}
            className="w-full rounded-md bg-(--color-action) px-3 py-2 text-sm font-medium text-(--color-action-text) transition-colors hover:bg-(--color-action-hover) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Réinitialiser
          </button>
          <a
            href="https://www.lulumineuse.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 text-xs text-(--color-text-secondary) transition-colors hover:text-(--color-action)"
          >
            <img src={lulumineuseLogo} alt="" className="h-5 w-5 shrink-0 object-contain" />
            <span>D&apos;après les partages de Lulumineuse</span>
          </a>
        </div>
      </div>
    </aside>
  )
}
