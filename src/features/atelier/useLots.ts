import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'
import type { Lot, LotDetail, LotCounts, JournalEvent, ConformityResult } from './types'

export function useLotsList(filtersKey: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.lotsList(filtersKey),
    queryFn: async () => {
      const res = await apiClient.findLots(params)
      if (res.status === 'error') throw new Error(res.errors[0])
      return res.data as { items: Lot[]; next_cursor: string | null }
    },
  })
}

export function useLotCounts() {
  return useQuery({
    queryKey: queryKeys.lotsCounts,
    queryFn: async () => {
      const res = await apiClient.getLotCounts()
      if (res.status === 'error') throw new Error(res.errors[0])
      return res.data as LotCounts
    },
  })
}

export function useLotDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.lotDetail(id),
    queryFn: async () => {
      const res = await apiClient.getLot(id)
      if (res.status === 'error') throw new Error(res.errors[0])
      return res.data as LotDetail
    },
  })
}

export function useLotJournal(id: number) {
  return useQuery({
    queryKey: queryKeys.lotJournal(id),
    queryFn: async () => {
      const res = await apiClient.getLotJournal(id)
      if (res.status === 'error') throw new Error(res.errors[0])
      return res.data as JournalEvent[]
    },
  })
}

export function useUpdateLotStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, message }: { id: number; status: string; message?: string }) =>
      apiClient.updateLotStatus(id, status, message),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.lotDetail(vars.id) })
      qc.invalidateQueries({ queryKey: queryKeys.lotJournal(vars.id) })
      qc.invalidateQueries({ queryKey: queryKeys.lotsAll })
    },
  })
}

export function useAssignLot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, userId }: { id: number; userId: number | null }) =>
      apiClient.assignLot(id, userId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.lotDetail(vars.id) })
      qc.invalidateQueries({ queryKey: queryKeys.lotsAll })
    },
  })
}

export function useIntegrateLot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.integrateLot(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.lotDetail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.lotJournal(id) })
      qc.invalidateQueries({ queryKey: queryKeys.lotsAll })
      qc.invalidateQueries({ queryKey: queryKeys.citationsAll })
    },
  })
}

export function useCheckConformity() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.checkLotConformity(id)
      if (res.status === 'error') throw new Error(res.errors[0])
      return res.data as ConformityResult
    },
  })
}

export function useUpdateLotDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ lotId, data }: { lotId: number; data: Record<string, unknown> }) =>
      apiClient.updateLotDocument(lotId, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.lotDetail(vars.lotId) })
    },
  })
}

export function useSetDocumentKeywords() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      lotId,
      keywordIds,
      source,
    }: {
      lotId: number
      keywordIds: number[]
      source?: string
    }) => apiClient.setLotDocumentKeywords(lotId, keywordIds, source),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.lotDetail(vars.lotId) })
    },
  })
}

export function useDeleteLotDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ lotId, docId }: { lotId: number; docId: number }) =>
      apiClient.deleteLotDocument(lotId, docId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.lotDetail(vars.lotId) })
      qc.invalidateQueries({ queryKey: queryKeys.lotsAll })
    },
  })
}
