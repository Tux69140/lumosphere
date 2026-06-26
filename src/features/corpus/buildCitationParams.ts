import type { CorpusFilters } from './types'

export function buildCitationParams(
  f: CorpusFilters,
  cursor?: string | null,
): Record<string, string> {
  const params: Record<string, string> = {}
  const q = f.query.trim()
  if (q) params.q = q
  if (f.oeuvreIds.length) params.oeuvre_ids = [...f.oeuvreIds].sort((a, b) => a - b).join(',')
  if (f.themeIds.length) params.theme_ids = [...f.themeIds].sort((a, b) => a - b).join(',')
  if (cursor) params.cursor = cursor
  return params
}
