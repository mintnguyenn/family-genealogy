import type {
  EnrichedRelationship,
  RelationshipStats
} from '@/components/relationship/relationshipTypes'
import { getPersons, getRelationships } from '@/lib/data'
import type { TranslationKey, TranslationValues } from '@/lib/i18n/messages'
import type { Person, Relationship } from '@/types'

type Translate = (key: TranslationKey, values?: TranslationValues) => string

export async function fetchRelationshipData(personId: string, t: Translate) {
  const [persons, relationships] = await Promise.all([
    getPersons(),
    getRelationships()
  ])
  return buildRelationshipData(persons, relationships, personId, t)
}

export function buildRelationshipData(
  persons: Person[],
  allRelationships: Relationship[],
  personId: string,
  t: Translate
): { relationships: EnrichedRelationship[]; stats: RelationshipStats } {
  const personsById = new Map(persons.map((p) => [p.id, p]))
  const linked = (
    side: 'person_a' | 'person_b',
    other: 'person_a' | 'person_b'
  ) =>
    allRelationships
      .filter((r) => r[side] === personId && personsById.has(r[other]))
      .map((r) => ({
        ...r,
        note: r.note ?? null,
        target: personsById.get(r[other])!
      }))
  const relsA = linked('person_a', 'person_b'),
    relsB = linked('person_b', 'person_a')
  const formattedRels: EnrichedRelationship[] = []

  // Process Rels where I am Person A
  relsA?.forEach((r) => {
    let direction: 'parent' | 'child' | 'spouse' = 'spouse'
    if (r.type === 'marriage') direction = 'spouse'
    else if (r.type === 'biological_child' || r.type === 'adopted_child')
      direction = 'child' // I am A (Parent), B is Child

    formattedRels.push({
      id: r.id,
      type: r.type,
      direction,
      targetPerson: r.target,
      note: r.note,
      createdAt: r.created_at
    })
  })

  // Process Rels where I am Person B
  relsB?.forEach((r) => {
    let direction: 'parent' | 'child' | 'spouse' = 'spouse'
    if (r.type === 'marriage') direction = 'spouse'
    else if (r.type === 'biological_child' || r.type === 'adopted_child')
      direction = 'parent' // I am B (Child), A is Parent

    formattedRels.push({
      id: r.id,
      type: r.type,
      direction,
      targetPerson: r.target,
      note: r.note,
      createdAt: r.created_at
    })
  })

  const children = formattedRels.filter((r) => r.direction === 'child')
  const childrenIds = children.map((r) => r.targetPerson.id)
  const childIdsOf = (gender: string) =>
    children
      .filter((r) => r.targetPerson.gender === gender)
      .map((r) => r.targetPerson.id)

  // The children's marriages (in-laws) and the grandchildren counts only need
  // the children's ids, so they are sent together.
  const childrenMarriages = allRelationships
    .filter(
      (r) =>
        r.type === 'marriage' &&
        (childrenIds.includes(r.person_a) || childrenIds.includes(r.person_b))
    )
    .map((r) => ({
      ...r,
      person_a_data: personsById.get(r.person_a),
      person_b_data: personsById.get(r.person_b)
    }))
  const countGrandchildren = (ids: string[]) =>
    allRelationships.filter(
      (r) => r.type !== 'marriage' && ids.includes(r.person_a)
    ).length
  const paternalGrandchildren = countGrandchildren(childIdsOf('male'))
  const maternalGrandchildren = countGrandchildren(childIdsOf('female'))

  const childIdSet = new Set(childrenIds)
  childrenMarriages.forEach((m) => {
    const isAChild = childIdSet.has(m.person_a)
    const childPerson = isAChild ? m.person_a_data : m.person_b_data
    const spousePerson = isAChild ? m.person_b_data : m.person_a_data

    if (spousePerson && childPerson) {
      const spouseGender = spousePerson.gender
      let noteLabel = t('spouseOf', { name: childPerson.full_name })
      if (spouseGender === 'female')
        noteLabel = t('daughterInLawOf', {
          name: childPerson.full_name
        })
      if (spouseGender === 'male')
        noteLabel = t('sonInLawOf', { name: childPerson.full_name })

      // Append existing marriage note if any
      if (m.note) noteLabel += ` - ${m.note}`

      formattedRels.push({
        id: m.id + '_inlaw',
        type: 'marriage',
        direction: 'child_in_law',
        targetPerson: spousePerson,
        note: noteLabel
      })
    }
  })

  const stats = computeRelationshipStats(
    formattedRels,
    paternalGrandchildren,
    maternalGrandchildren
  )

  return { relationships: formattedRels, stats }
}

function computeRelationshipStats(
  formattedRels: EnrichedRelationship[],
  paternalGrandchildren: number,
  maternalGrandchildren: number
): RelationshipStats {
  const biologicalChildrenList = formattedRels.filter(
    (r) => r.direction === 'child' && r.type === 'biological_child'
  )
  const biologicalChildren = biologicalChildrenList.length
  const maleBiologicalChildren = biologicalChildrenList.filter(
    (c) => c.targetPerson.gender === 'male'
  ).length
  const femaleBiologicalChildren = biologicalChildrenList.filter(
    (c) => c.targetPerson.gender === 'female'
  ).length

  const daughterInLaw = formattedRels.filter(
    (r) => r.direction === 'child_in_law' && r.targetPerson.gender === 'female'
  ).length
  const sonInLaw = formattedRels.filter(
    (r) => r.direction === 'child_in_law' && r.targetPerson.gender === 'male'
  ).length

  return {
    biologicalChildren,
    maleBiologicalChildren,
    femaleBiologicalChildren,
    paternalGrandchildren,
    maternalGrandchildren,
    sonInLaw,
    daughterInLaw
  }
}
