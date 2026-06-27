import type { Theme, ThemeNode, CheckState } from './types'

export function buildThemeTree(themes: Theme[]): ThemeNode[] {
  return themes
    .filter((t) => t.parent_id === null)
    .map((root) => ({
      id: root.id,
      nom: root.nom,
      children: themes.filter((t) => t.parent_id === root.id),
    }))
}

/** Ids of a node's "group": the node itself plus its direct children (if any). */
function groupIds(tree: ThemeNode[], id: number): number[] {
  const node = tree.find((n) => n.id === id)
  return node ? [node.id, ...node.children.map((c) => c.id)] : [id]
}

export function toggleThemeNode(selected: number[], tree: ThemeNode[], id: number): number[] {
  const set = new Set(selected)
  const node = tree.find((n) => n.id === id)
  // Child or leaf root: toggle just this id.
  if (!node || node.children.length === 0) {
    if (set.has(id)) {
      set.delete(id)
    } else {
      set.add(id)
    }
    return [...set]
  }
  // Parent with children: select-all / deselect-all the group.
  const ids = groupIds(tree, id)
  const allSelected = ids.every((i) => set.has(i))
  ids.forEach((i) => {
    if (allSelected) {
      set.delete(i)
    } else {
      set.add(i)
    }
  })
  return [...set]
}

export function getThemeCheckState(selected: number[], tree: ThemeNode[], id: number): CheckState {
  const set = new Set(selected)
  const node = tree.find((n) => n.id === id)
  if (!node || node.children.length === 0) {
    return set.has(id) ? 'checked' : 'unchecked'
  }
  const ids = [node.id, ...node.children.map((c) => c.id)]
  const count = ids.filter((i) => set.has(i)).length
  if (count === 0) return 'unchecked'
  if (count === ids.length) return 'checked'
  return 'indeterminate'
}
