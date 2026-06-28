import { useNavigate } from 'react-router'
import { Eye, ArrowRight, User } from '@phosphor-icons/react'
import type { Lot, LotStatus } from '../types'
import { LOT_STATUS_LABELS, LOT_STATUS_COLORS, LOT_VALID_TRANSITIONS } from '../types'
import { useUpdateLotStatus } from '../useLots'

type Props = {
  lots: Lot[]
  loading?: boolean
}

function StatusBadge({ status }: { status: LotStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${LOT_STATUS_COLORS[status]}`}
    >
      {LOT_STATUS_LABELS[status]}
    </span>
  )
}

export function ListeLots({ lots, loading }: Props) {
  const navigate = useNavigate()
  const updateStatus = useUpdateLotStatus()

  if (loading) {
    return <p className="py-8 text-center text-sm text-(--color-text-muted)">Chargement...</p>
  }

  if (lots.length === 0) {
    return <p className="py-8 text-center text-sm text-(--color-text-muted)">Aucun lot.</p>
  }

  function handleNextStatus(lot: Lot) {
    const next = LOT_VALID_TRANSITIONS[lot.status][0]
    if (!next) return
    updateStatus.mutate({ id: lot.id, status: next })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border) text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
            <th className="px-3 py-3">Lot</th>
            <th className="px-3 py-3">Source</th>
            <th className="px-3 py-3">Statut</th>
            <th className="hidden px-3 py-3 md:table-cell">Assigné à</th>
            <th className="hidden px-3 py-3 lg:table-cell">Documents</th>
            <th className="hidden px-3 py-3 lg:table-cell">Date</th>
            <th className="px-3 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--color-border)">
          {lots.map((lot) => {
            const nextStates = LOT_VALID_TRANSITIONS[lot.status]
            return (
              <tr
                key={lot.id}
                className="cursor-pointer transition-colors hover:bg-(--color-bg-hover)"
                onClick={() => navigate(`/atelier/lot/${lot.id}`)}
              >
                <td className="px-3 py-3">
                  <div>
                    <span className="font-medium text-(--color-text)">{lot.nom}</span>
                    {lot.description && (
                      <p className="mt-0.5 truncate text-xs text-(--color-text-muted)">
                        {lot.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {lot.source_type}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={lot.status} />
                </td>
                <td className="hidden px-3 py-3 md:table-cell">
                  {lot.assigned_prenom ? (
                    <span className="flex items-center gap-1 text-(--color-text-muted)">
                      <User size={14} />
                      {lot.assigned_prenom} {lot.assigned_nom}
                    </span>
                  ) : (
                    <span className="text-(--color-text-muted)">—</span>
                  )}
                </td>
                <td className="hidden px-3 py-3 lg:table-cell">
                  <span className="text-(--color-text-muted)">{lot.document_count}</span>
                </td>
                <td className="hidden px-3 py-3 lg:table-cell">
                  <span className="text-xs text-(--color-text-muted)">
                    {new Date(lot.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <div
                    className="flex items-center justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {nextStates.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleNextStatus(lot)}
                        disabled={updateStatus.isPending}
                        className="rounded-md p-1.5 text-(--color-text-muted) transition-colors hover:bg-(--color-bg-hover) hover:text-(--color-accent)"
                        title={`Passer en : ${LOT_STATUS_LABELS[nextStates[0]!]}`}
                        aria-label={`Passer en : ${LOT_STATUS_LABELS[nextStates[0]!]}`}
                      >
                        <ArrowRight size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/atelier/lot/${lot.id}`)}
                      className="rounded-md p-1.5 text-(--color-text-muted) transition-colors hover:bg-(--color-bg-hover) hover:text-(--color-accent)"
                      title="Voir le détail"
                      aria-label="Voir le détail"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
