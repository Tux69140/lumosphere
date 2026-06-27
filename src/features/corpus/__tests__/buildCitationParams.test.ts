import { describe, it, expect } from 'vitest'
import { buildCitationParams } from '@/features/corpus/buildCitationParams'
import type { CorpusFilters } from '@/features/corpus/types'

const base: CorpusFilters = {
  query: '',
  oeuvreIds: [],
  themeIds: [],
  keywordIds: [],
  keywordMode: null,
  dateFrom: '',
  dateTo: '',
  sort: 'date',
}

describe('buildCitationParams', () => {
  it("omet tout quand rien n'est rempli", () => {
    expect(buildCitationParams({ ...base, query: '   ' })).toEqual({})
  })
  it('inclut q nettoyé', () => {
    expect(buildCitationParams({ ...base, query: '  âme ' })).toEqual({ q: 'âme' })
  })
  it('joint et trie les ids', () => {
    expect(buildCitationParams({ ...base, oeuvreIds: [2, 1], themeIds: [5, 3, 4] })).toEqual({
      oeuvre_ids: '1,2',
      theme_ids: '3,4,5',
    })
  })
  it('passe keyword_ids et keyword_mode quand définis', () => {
    expect(buildCitationParams({ ...base, keywordIds: [3, 1], keywordMode: 'AND' })).toEqual({
      keyword_ids: '1,3',
      keyword_mode: 'and',
    })
  })
  it('passe date_from et date_to quand définis', () => {
    expect(buildCitationParams({ ...base, dateFrom: '2024-01-01', dateTo: '2024-12-31' })).toEqual({
      date_from: '2024-01-01',
      date_to: '2024-12-31',
    })
  })
  it("passe sort=score uniquement quand query est défini et sort='score'", () => {
    expect(buildCitationParams({ ...base, query: 'test', sort: 'score' })).toEqual({
      q: 'test',
      sort: 'score',
    })
    expect(buildCitationParams({ ...base, sort: 'score' })).toEqual({})
  })
})
