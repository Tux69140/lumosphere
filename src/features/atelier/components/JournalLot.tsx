import { ClockCounterClockwise, ArrowRight } from '@phosphor-icons/react'
import { useLotJournal } from '../useLots'
import { LOT_STATUS_LABELS } from '../types'
import type { LotStatus } from '../types'

type Props = { lotId: number }

export function JournalLot({ lotId }: Props) {
  const { data: events, isLoading, error } = useLotJournal(lotId)

  if (isLoading)
    return <p className="py-4 text-center text-sm text-(--color-text-muted)">Chargement...</p>
  if (error)
    return <p className="py-4 text-center text-sm text-red-500">Erreur : {error.message}</p>
  if (!events || events.length === 0)
    return <p className="py-4 text-center text-sm text-(--color-text-muted)">Aucun événement.</p>

  return (
    <div className="space-y-3">
      {events.map((ev) => (
        <div
          key={ev.id}
          className="flex items-start gap-3 rounded-lg border border-(--color-border) p-3"
        >
          <ClockCounterClockwise size={18} className="mt-0.5 shrink-0 text-(--color-text-muted)" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-(--color-text)">
                {ev.event_type === 'status_change' ? 'Changement de statut' : ev.event_type}
              </span>
              {ev.old_status && ev.new_status && (
                <span className="flex items-center gap-1 text-(--color-text-muted)">
                  {LOT_STATUS_LABELS[ev.old_status as LotStatus] ?? ev.old_status}
                  <ArrowRight size={12} />
                  {LOT_STATUS_LABELS[ev.new_status as LotStatus] ?? ev.new_status}
                </span>
              )}
            </div>
            {ev.message && <p className="mt-1 text-sm text-(--color-text-muted)">{ev.message}</p>}
            <p className="mt-1 text-xs text-(--color-text-muted)">
              {ev.actor_prenom ? `${ev.actor_prenom} ${ev.actor_nom}` : 'Système'}
              {' — '}
              {new Date(ev.created_at).toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
