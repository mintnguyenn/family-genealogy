import { getPersons, getRelationships } from '@/lib/data'
import type { LinkedRelative } from '@/utils/relationshipValidation'

export interface SavedRelatives {
  parents: LinkedRelative[]
  children: LinkedRelative[]
}

export async function loadSavedRelatives(
  personId: string
): Promise<SavedRelatives> {
  const [persons, relationships] = await Promise.all([
    getPersons(),
    getRelationships()
  ])
  const parents = new Map<string, boolean>(),
    children = new Map<string, boolean>()
  for (const rel of relationships) {
    if (rel.type !== 'biological_child' && rel.type !== 'adopted_child')
      continue
    const adopted = rel.type === 'adopted_child'
    if (rel.person_a === personId)
      children.set(
        rel.person_b,
        (children.get(rel.person_b) ?? true) && adopted
      )
    if (rel.person_b === personId)
      parents.set(rel.person_a, (parents.get(rel.person_a) ?? true) && adopted)
  }
  return {
    parents: persons
      .filter((p) => parents.has(p.id))
      .map((p) => ({ ...p, adopted: parents.get(p.id) })),
    children: persons
      .filter((p) => children.has(p.id))
      .map((p) => ({ ...p, adopted: children.get(p.id) }))
  }
}
