import { useContext } from 'react'
import { CorpusSearchContext, type CorpusSearchContextValue } from './CorpusSearchProvider'

export function useCorpusSearch(): CorpusSearchContextValue {
  const ctx = useContext(CorpusSearchContext)
  if (!ctx) {
    throw new Error('useCorpusSearch doit être utilisé dans un CorpusSearchProvider')
  }
  return ctx
}

/**
 * Variante non-bloquante : renvoie `null` hors d'un CorpusSearchProvider
 * (ex. le Header sur la page de connexion). À utiliser quand le contexte est optionnel.
 */
export function useCorpusSearchOptional(): CorpusSearchContextValue | null {
  return useContext(CorpusSearchContext)
}
