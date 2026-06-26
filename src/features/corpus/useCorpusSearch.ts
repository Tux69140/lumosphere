import { useContext } from 'react'
import { CorpusSearchContext, type CorpusSearchContextValue } from './CorpusSearchProvider'

export function useCorpusSearch(): CorpusSearchContextValue {
  const ctx = useContext(CorpusSearchContext)
  if (!ctx) {
    throw new Error('useCorpusSearch doit être utilisé dans un CorpusSearchProvider')
  }
  return ctx
}
