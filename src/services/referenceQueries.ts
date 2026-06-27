import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'

// Lève si status !== 'ok' → l'erreur remonte au QueryCache.onError (toast centralisé).
export async function unwrap<T>(
  p: Promise<{ status: string; data: T | null; errors: string[] }>,
): Promise<T> {
  const r = await p
  if (r.status !== 'ok') throw new Error(r.errors?.[0] ?? 'Erreur de chargement.')
  if (r.data === null || r.data === undefined) throw new Error('Réponse API vide.')
  return r.data as T
}

export function useOeuvres() {
  return useQuery({
    queryKey: queryKeys.oeuvres,
    queryFn: () => unwrap(apiClient.findOeuvres()),
  })
}

export function useAuteurs() {
  return useQuery({
    queryKey: queryKeys.auteurs,
    queryFn: () => unwrap(apiClient.findAuteurs()),
  })
}

export function useThemes() {
  return useQuery({
    queryKey: queryKeys.themes,
    queryFn: () => unwrap(apiClient.findThemes()),
  })
}

export function useKeywords() {
  return useQuery({
    queryKey: queryKeys.keywords,
    queryFn: () => unwrap<{ id: number; mot: string }[]>(apiClient.findKeywords()),
  })
}

export function useEtats() {
  return useQuery({
    queryKey: queryKeys.etats,
    queryFn: () => unwrap(apiClient.findEtats()),
  })
}

export function useEmojis() {
  return useQuery({
    queryKey: queryKeys.emojis,
    queryFn: () => unwrap<{ id: number; code: string }[]>(apiClient.findEmojis()),
  })
}
