import { describe, it, expect } from 'vitest'
import { LOT_VALID_TRANSITIONS, LOT_STATUS_LABELS, LOT_STATUS_COLORS } from '../types'
import type { LotStatus } from '../types'

const ALL_STATUSES: LotStatus[] = [
  'en_attente',
  'en_cours',
  'en_traitement',
  'en_revision',
  'a_reprendre',
  'pret',
  'integre',
  'erreur',
]

describe('LOT_VALID_TRANSITIONS', () => {
  it('couvre exactement les 8 statuts', () => {
    expect(Object.keys(LOT_VALID_TRANSITIONS).sort()).toEqual([...ALL_STATUSES].sort())
  })

  it('integre est un état terminal (aucune transition)', () => {
    expect(LOT_VALID_TRANSITIONS.integre).toEqual([])
  })

  it('en_attente ne peut aller que vers en_cours', () => {
    expect(LOT_VALID_TRANSITIONS.en_attente).toEqual(['en_cours'])
  })

  it('en_traitement peut aller vers en_revision ou erreur', () => {
    expect(LOT_VALID_TRANSITIONS.en_traitement).toEqual(['en_revision', 'erreur'])
  })

  it('pret peut aller vers integre ou en_revision', () => {
    expect(LOT_VALID_TRANSITIONS.pret).toEqual(['integre', 'en_revision'])
  })

  it('erreur peut retourner en en_traitement', () => {
    expect(LOT_VALID_TRANSITIONS.erreur).toEqual(['en_traitement'])
  })

  it('a_reprendre retourne en en_cours', () => {
    expect(LOT_VALID_TRANSITIONS.a_reprendre).toEqual(['en_cours'])
  })

  it('en_revision peut aller vers pret ou a_reprendre', () => {
    expect(LOT_VALID_TRANSITIONS.en_revision).toEqual(['pret', 'a_reprendre'])
  })

  it('toutes les cibles de transition sont des statuts valides', () => {
    for (const [, targets] of Object.entries(LOT_VALID_TRANSITIONS)) {
      for (const target of targets) {
        expect(ALL_STATUSES).toContain(target)
      }
    }
  })

  it('aucun statut ne peut transitionner vers lui-même', () => {
    for (const [status, targets] of Object.entries(LOT_VALID_TRANSITIONS)) {
      expect(targets).not.toContain(status)
    }
  })
})

describe('LOT_STATUS_LABELS', () => {
  it('fournit un label pour chaque statut', () => {
    for (const status of ALL_STATUSES) {
      expect(LOT_STATUS_LABELS[status]).toBeTruthy()
    }
  })

  it('les labels sont en français', () => {
    expect(LOT_STATUS_LABELS.en_revision).toBe('En révision')
    expect(LOT_STATUS_LABELS.a_reprendre).toBe('À reprendre')
    expect(LOT_STATUS_LABELS.integre).toBe('Intégré')
  })
})

describe('LOT_STATUS_COLORS', () => {
  it('fournit des classes Tailwind pour chaque statut', () => {
    for (const status of ALL_STATUSES) {
      const color = LOT_STATUS_COLORS[status]
      expect(color).toBeTruthy()
      expect(color).toContain('bg-')
      expect(color).toContain('text-')
    }
  })

  it('erreur utilise du rouge', () => {
    expect(LOT_STATUS_COLORS.erreur).toContain('red')
  })

  it('pret utilise du vert', () => {
    expect(LOT_STATUS_COLORS.pret).toContain('green')
  })
})
