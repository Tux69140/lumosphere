import { useCallback, useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_ADMIN, ROLE_EDITEUR } from '@/constants/roles'
import { queryKeys } from '@/services/queryKeys'
import { unwrap } from '@/services/referenceQueries'

const LS_KEY = 'lum_favorites'

let localCache: Set<number> | null = null
const listeners = new Set<() => void>()

function readLocalFavorites(): Set<number> {
  if (localCache) return localCache
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        localCache = new Set(parsed.map(Number))
        return localCache
      }
    }
  } catch {
    // corrupted
  }
  localCache = new Set()
  return localCache
}

function writeLocalFavorites(ids: Set<number>): void {
  localCache = ids
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]))
  listeners.forEach((fn) => fn())
}

function subscribeLocal(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function _resetLocalFavoritesCache(): void {
  localCache = null
}

function useLocalFavorites(): Set<number> {
  return useSyncExternalStore(subscribeLocal, readLocalFavorites, () => new Set())
}

type FavoriteItem = { citation_id?: number; id?: number }
type FavoritesCache = { items: FavoriteItem[]; next_cursor: string | null }

type UseFavoritesResult = {
  favoriteIds: Set<number>
  toggle: (id: number) => void
  loading: boolean
}

export function useFavorites(): UseFavoritesResult {
  const { user } = useAuth()
  const isServerUser = user !== null && [ROLE_ADMIN, ROLE_EDITEUR].includes(user.role_id)
  const queryClient = useQueryClient()

  const localFavoriteIds = useLocalFavorites()

  // Utilisateur serveur : chargement via React Query
  const query = useQuery({
    queryKey: queryKeys.favorites,
    queryFn: () => unwrap(apiClient.findFavorites()),
    enabled: isServerUser,
    structuralSharing: false,
  })

  const serverFavoriteIds = query.data
    ? new Set(
        (query.data.items as FavoriteItem[])
          .map((item) => item.citation_id ?? item.id ?? 0)
          .filter((id) => id > 0),
      )
    : new Set<number>()

  // Mutation optimiste pour les utilisateurs serveur
  const { mutate: toggleMutation } = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'add' | 'remove' }) => {
      const res =
        action === 'remove' ? await apiClient.removeFavorite(id) : await apiClient.addFavorite(id)
      if (res.status !== 'ok') throw new Error(res.errors?.[0] ?? 'Erreur favoris.')
    },
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites })
      const snapshot = queryClient.getQueryData<FavoritesCache>(queryKeys.favorites)
      queryClient.setQueryData<FavoritesCache>(queryKeys.favorites, (old) => {
        if (!old) return old
        if (action === 'remove') {
          return {
            ...old,
            items: old.items.filter((item) => (item.citation_id ?? item.id) !== id),
          }
        }
        return { ...old, items: [...old.items, { citation_id: id }] }
      })
      return { snapshot }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKeys.favorites, context?.snapshot)
      toast.error('Impossible de mettre à jour le favori.')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites })
      void queryClient.invalidateQueries({ queryKey: queryKeys.citationsAll })
    },
  })

  const toggle = useCallback(
    (id: number) => {
      if (isServerUser) {
        const current = queryClient.getQueryData<FavoritesCache>(queryKeys.favorites)
        const wasSet = current?.items.some((item) => (item.citation_id ?? item.id) === id) ?? false
        toggleMutation({ id, action: wasSet ? 'remove' : 'add' })
      } else {
        const next = new Set(localFavoriteIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        writeLocalFavorites(next)
      }
    },
    [isServerUser, toggleMutation, queryClient],
  )

  return {
    favoriteIds: isServerUser ? serverFavoriteIds : localFavoriteIds,
    toggle,
    loading: isServerUser ? query.isLoading : false,
  }
}
