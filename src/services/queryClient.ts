import { QueryClient, QueryCache } from '@tanstack/react-query'
import { toast } from 'sonner'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    // Les erreurs de CHARGEMENT (queries) remontent ici une seule fois → toast centralisé.
    queryCache: new QueryCache({
      onError: (error, query) => {
        // La recherche corpus (citationsSearch) a une bannière inline dans AccueilPage.
        // Les autres queries (dont citationsAdmin) doivent toaster.
        if (query.queryKey[1] === 'search') return
        toast.error(error instanceof Error ? error.message : 'Erreur de chargement.')
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

// Instance unique pour l'application (les tests utilisent createQueryClient()).
export const queryClient = createQueryClient()
