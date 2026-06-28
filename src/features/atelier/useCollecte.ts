import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'
import type { Lot } from './types'

type PollOpts = { intervalMs?: number; maxTries?: number }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Sonde les lots créés jusqu'à ce qu'ils quittent `en_traitement`. */
export async function pollLotsUntilDone(
  lotIds: string[],
  onDone: () => void,
  onError: () => void,
  opts: PollOpts = {},
): Promise<void> {
  const intervalMs = opts.intervalMs ?? 4000
  const maxTries = opts.maxTries ?? 60
  for (let i = 0; i < maxTries; i++) {
    const res = await apiClient.findLots()
    if (res.status === 'ok') {
      const items = (res.data?.items ?? []) as Array<Pick<Lot, 'nom' | 'status'>>
      const mine = items.filter((l) => lotIds.includes(l.nom))
      if (mine.some((l) => l.status === 'erreur')) {
        onError()
        return
      }
      if (mine.length > 0 && mine.every((l) => l.status !== 'en_traitement')) {
        onDone()
        return
      }
    }
    await sleep(intervalMs)
  }
}

export function useRunCollect() {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.collecteRun()
      if (res.status === 'error') throw new Error(res.errors[0])
      return res.data as { lots: string[] }
    },
    onMutate: () => {
      toast.loading('📥 Récupération lancée, traitement en cours…', { id: 'collecte' })
    },
    onError: (e) => {
      toast.error(`⚠️ La récupération a échoué : ${(e as Error).message}`, {
        id: 'collecte',
        duration: 10000,
      })
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.lotsAll })
      if (data.lots.length === 0) {
        toast.info('Aucun nouveau message à récupérer.', { id: 'collecte' })
        return
      }
      toast.success(`Lot créé, nettoyage en cours… (${data.lots.length})`, { id: 'collecte' })
      void pollLotsUntilDone(
        data.lots,
        () => {
          qc.invalidateQueries({ queryKey: queryKeys.lotsAll })
          toast.success('✅ Lot prêt à réviser', {
            duration: Infinity, // reste jusqu'au clic (toast actionnable)
            action: {
              label: "Ouvrir l'atelier",
              onClick: () => (window.location.href = '/atelier'),
            },
          })
        },
        () => {
          qc.invalidateQueries({ queryKey: queryKeys.lotsAll })
          toast.error('⚠️ Le traitement a échoué, voir le lot', {
            duration: Infinity,
            action: { label: 'Voir', onClick: () => (window.location.href = '/atelier') },
          })
        },
      )
    },
  })
  return { run: () => mutation.mutate(), isPending: mutation.isPending }
}

export function useTopup() {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (more: number) => {
      const res = await apiClient.collecteTopup(more)
      if (res.status === 'error') throw new Error(res.errors[0])
      return res.data as { created: number }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.lotsAll }),
  })
  return { topup: (more = 0) => mutation.mutate(more) }
}
