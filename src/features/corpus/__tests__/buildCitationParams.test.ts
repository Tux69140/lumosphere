import { describe, it, expect } from 'vitest'
import { buildCitationParams } from '@/features/corpus/buildCitationParams'

describe('buildCitationParams', () => {
  it("omet tout quand rien n'est rempli", () => {
    expect(buildCitationParams({ query: '   ', oeuvreIds: [], themeIds: [] })).toEqual({})
  })
  it('inclut q nettoyé', () => {
    expect(buildCitationParams({ query: '  âme ', oeuvreIds: [], themeIds: [] })).toEqual({
      q: 'âme',
    })
  })
  it('joint et trie les ids', () => {
    expect(buildCitationParams({ query: '', oeuvreIds: [2, 1], themeIds: [5, 3, 4] })).toEqual({
      oeuvre_ids: '1,2',
      theme_ids: '3,4,5',
    })
  })
})
