import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_ADMIN, ROLE_EDITEUR } from '@/constants/roles'

const LS_KEY = 'lum_favorites'

function loadLocalFavorites(): Set<number> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return new Set(parsed.map(Number))
  } catch {
    // corrupted storage
  }
  return new Set()
}

function saveLocalFavorites(ids: Set<number>): void {
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]))
}

type UseFavoritesResult = {
  favoriteIds: Set<number>
  toggle: (id: number) => void
  loading: boolean
}

export function useFavorites(): UseFavoritesResult {
  const { user } = useAuth()
  const isServerUser = user !== null && [ROLE_ADMIN, ROLE_EDITEUR].includes(user.role_id)

  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (isServerUser) {
        try {
          const res = await apiClient.findFavorites()
          if (cancelled) return
          if (res.status === 'ok' && res.data) {
            const ids = (res.data.items as { citation_id?: number; id?: number }[]).map(
              (item) => item.citation_id ?? item.id ?? 0,
            )
            setFavoriteIds(new Set(ids.filter((id) => id > 0)))
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      } else {
        setFavoriteIds(loadLocalFavorites())
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isServerUser])

  const toggle = useCallback(
    (id: number) => {
      if (isServerUser) {
        const wasSet = favoriteIds.has(id)
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          if (wasSet) next.delete(id)
          else next.add(id)
          return next
        })
        const call = wasSet ? apiClient.removeFavorite(id) : apiClient.addFavorite(id)
        call.then((res) => {
          if (res.status !== 'ok') {
            setFavoriteIds((prev) => {
              const next = new Set(prev)
              if (wasSet) next.add(id)
              else next.delete(id)
              return next
            })
            toast.error('Impossible de mettre à jour le favori.')
          }
        })
      } else {
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          saveLocalFavorites(next)
          return next
        })
      }
    },
    [isServerUser, favoriteIds],
  )

  return { favoriteIds, toggle, loading }
}
