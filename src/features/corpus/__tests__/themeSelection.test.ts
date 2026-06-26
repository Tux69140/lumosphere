import { describe, it, expect } from 'vitest'
import {
  buildThemeTree,
  toggleThemeNode,
  getThemeCheckState,
} from '@/features/corpus/themeSelection'
import type { Theme } from '@/features/corpus/types'

// Spiritualité(1) > Méditation(2), Prière(3) ; Amour(4) sans enfant
const THEMES: Theme[] = [
  { id: 1, nom: 'Spiritualité', parent_id: null },
  { id: 2, nom: 'Méditation', parent_id: 1 },
  { id: 3, nom: 'Prière', parent_id: 1 },
  { id: 4, nom: 'Amour', parent_id: null },
]
const TREE = buildThemeTree(THEMES)

describe('buildThemeTree', () => {
  it('regroupe enfants sous parents et garde les racines sans enfant', () => {
    expect(TREE).toHaveLength(2)
    expect(TREE[0]).toMatchObject({ id: 1, nom: 'Spiritualité' })
    expect(TREE[0].children.map((c) => c.id)).toEqual([2, 3])
    expect(TREE[1].children).toEqual([])
  })
})

describe('toggleThemeNode', () => {
  it('cocher un parent sélectionne le parent et tous ses enfants', () => {
    expect(toggleThemeNode([], TREE, 1).sort()).toEqual([1, 2, 3])
  })
  it('re-cocher un parent entièrement sélectionné désélectionne tout le groupe', () => {
    expect(toggleThemeNode([1, 2, 3], TREE, 1)).toEqual([])
  })
  it('décocher un enfant retire seulement cet enfant (parent reste)', () => {
    expect(toggleThemeNode([1, 2, 3], TREE, 2).sort()).toEqual([1, 3])
  })
  it('cocher un thème racine sans enfant ne touche que lui', () => {
    expect(toggleThemeNode([], TREE, 4)).toEqual([4])
  })
})

describe('getThemeCheckState', () => {
  it('parent entièrement sélectionné = checked', () => {
    expect(getThemeCheckState([1, 2, 3], TREE, 1)).toBe('checked')
  })
  it('parent partiellement sélectionné = indeterminate', () => {
    expect(getThemeCheckState([1, 3], TREE, 1)).toBe('indeterminate')
  })
  it('parent non sélectionné = unchecked', () => {
    expect(getThemeCheckState([], TREE, 1)).toBe('unchecked')
  })
  it('enfant sélectionné = checked', () => {
    expect(getThemeCheckState([1, 2, 3], TREE, 2)).toBe('checked')
  })
})
