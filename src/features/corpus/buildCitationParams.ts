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
  if (f.keywordIds.length) {
    params.keyword_ids = [...f.keywordIds].sort((a, b) => a - b).join(',')
    if (f.keywordMode) params.keyword_mode = f.keywordMode.toLowerCase()
  }
  if (f.dateFrom) params.date_from = f.dateFrom
  if (f.dateTo) params.date_to = f.dateTo
  if (q && f.sort === 'score') params.sort = 'score'
  if (cursor) params.cursor = cursor
  return params
}
