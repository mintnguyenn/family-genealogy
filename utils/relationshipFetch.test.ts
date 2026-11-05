import { describe, expect, test } from 'bun:test'

import { getMessages } from '@/lib/i18n/messages'
import type { Person, Relationship } from '@/types'

import { buildRelationshipData } from './relationshipFetch'

const dictionary = getMessages('en')
const translate = (key: keyof typeof dictionary) => dictionary[key]
const person = (id: string, gender: Person['gender']) =>
  ({ id, gender, full_name: id }) as Person
const link = (
  id: string,
  person_a: string,
  person_b: string,
  type: Relationship['type'] = 'biological_child'
): Relationship => ({
  id,
  person_a,
  person_b,
  type,
  created_at: '2026-01-01',
  updated_at: '2026-01-01'
})

describe('relationship projection from domain data', () => {
  test('derives parents, children, in-laws and grandchild counts', () => {
    const persons = [
      person('root', 'male'),
      person('parent', 'male'),
      person('son', 'male'),
      person('daughter', 'female'),
      person('wife', 'female'),
      person('husband', 'male'),
      person('grandson', 'male'),
      person('granddaughter', 'female')
    ]
    const links = [
      link('parent', 'parent', 'root'),
      link('son', 'root', 'son'),
      link('daughter', 'root', 'daughter'),
      link('wife', 'son', 'wife', 'marriage'),
      link('husband', 'daughter', 'husband', 'marriage'),
      link('grandson', 'son', 'grandson'),
      link('granddaughter', 'daughter', 'granddaughter')
    ]
    const result = buildRelationshipData(persons, links, 'root', translate)
    expect(
      result.relationships
        .filter((r) => r.direction === 'parent')
        .map((r) => r.targetPerson.id)
    ).toEqual(['parent'])
    expect(
      result.relationships
        .filter((r) => r.direction === 'child_in_law')
        .map((r) => r.targetPerson.id)
    ).toEqual(['wife', 'husband'])
    expect(result.stats).toMatchObject({
      biologicalChildren: 2,
      maleBiologicalChildren: 1,
      femaleBiologicalChildren: 1,
      paternalGrandchildren: 1,
      maternalGrandchildren: 1,
      daughterInLaw: 1,
      sonInLaw: 1
    })
  })

  test('ignores a relationship whose person is absent', () => {
    const result = buildRelationshipData(
      [person('root', 'male')],
      [link('missing', 'root', 'absent')],
      'root',
      translate
    )
    expect(result.relationships).toEqual([])
    expect(result.stats.biologicalChildren).toBe(0)
  })
})
