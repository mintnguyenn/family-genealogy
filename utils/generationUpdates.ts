import type { ComputedUpdate } from '@/utils/lineageCompute'

/**
 * One row of the `update_generations(updates jsonb)` database function. A
 * column is only changed when its key is present.
 */
export interface GenerationUpdate {
  id: string
  generation?: number | null
  birth_order?: number | null
  is_in_law?: boolean
}

/**
 * Everyone below `rootId` through parent-child links (`person_a` is the
 * parent, `person_b` the child), in breadth-first order, each once. The root
 * itself is never included, even when old data has a parent-child loop back
 * to it.
 */
export function collectDescendants(
  relationships: { person_a: string; person_b: string }[],
  rootId: string
): string[] {
  const childrenMap = new Map<string, string[]>()
  for (const r of relationships) {
    const children = childrenMap.get(r.person_a)
    if (children) children.push(r.person_b)
    else childrenMap.set(r.person_a, [r.person_b])
  }

  const visited = new Set<string>([rootId])
  const order = [rootId]
  for (let i = 0; i < order.length; i++) {
    for (const child of childrenMap.get(order[i]) ?? []) {
      if (!visited.has(child)) {
        visited.add(child)
        order.push(child)
      }
    }
  }
  return order.slice(1)
}

/**
 * Shifts the generation of each descendant by `delta` (never below 1).
 * Members without a generation are left out.
 */
export function buildDescendantGenerationUpdates(
  persons: { id: string; generation: number | null }[],
  delta: number
): GenerationUpdate[] {
  return persons
    .filter((p) => p.generation !== null && p.generation !== undefined)
    .map((p) => ({
      id: p.id,
      generation: Math.max(1, (p.generation as number) + delta)
    }))
}

/** The changed rows of the lineage tool's preview. */
export function buildLineageUpdates(
  updates: ComputedUpdate[]
): GenerationUpdate[] {
  return updates
    .filter((u) => u.changed)
    .map((u) => ({
      id: u.id,
      generation: u.new_generation,
      birth_order: u.new_birth_order,
      is_in_law: u.new_is_in_law
    }))
}
