// src/components/Sidebar.tsx
import { MagnifyingGlass } from '@phosphor-icons/react'

export function Sidebar() {
  return (
    <aside className="w-full shrink-0 border-b border-(--color-border) bg-(--color-bg-sidebar) p-4 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="mb-4">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-placeholder)"
          />
          <input
            type="text"
            placeholder="Rechercher dans le contenu…"
            disabled
            className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) py-2 pl-9 pr-3 text-sm text-(--color-text-placeholder) placeholder:text-(--color-text-placeholder)"
          />
        </div>
      </div>

      <div className="mb-3">
        <h3 className="mb-1 text-xs font-semibold uppercase text-(--color-text-secondary)">
          Œuvres
        </h3>
        <p className="text-xs text-(--color-text-placeholder)">Aucun filtre disponible</p>
      </div>

      <div className="mb-3">
        <h3 className="mb-1 text-xs font-semibold uppercase text-(--color-text-secondary)">
          Thèmes
        </h3>
        <p className="text-xs text-(--color-text-placeholder)">Aucun filtre disponible</p>
      </div>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase text-(--color-text-secondary)">
          Mots-clés
        </h3>
        <p className="text-xs text-(--color-text-placeholder)">Aucun filtre disponible</p>
      </div>
    </aside>
  )
}
