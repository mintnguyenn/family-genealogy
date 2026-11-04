import { describe, expect, test } from 'bun:test'

import {
  groupPossibleDuplicates,
  type DuplicateScanPerson,
  type DuplicateScanRelationship
} from './duplicatePeople'

function p(
  id: string,
  full_name: string,
  birth_year: number | null = null
): DuplicateScanPerson {
  return { id, full_name, birth_year, death_year: null }
}

function child(parent: string, kid: string): DuplicateScanRelationship {
  return { type: 'biological_child', person_a: parent, person_b: kid }
}

const ids = (g: { members: { id: string }[] }) => g.members.map((m) => m.id)

describe('groupPossibleDuplicates', () => {
  test('groups the same name and birth year, ignoring accents and case', () => {
    const groups = groupPossibleDuplicates(
      [
        p('1', 'Nguyễn Văn An', 1950),
        p('2', ' nguyen  van an', 1950),
        p('3', 'Lê Bình', 1950)
      ],
      []
    )
    expect(groups.map(ids)).toEqual([['1', '2']])
  })

  test('groups the same name under the same parent', () => {
    const groups = groupPossibleDuplicates(
      [
        p('1', 'Trần Cường', 1980),
        p('2', 'Tran Cuong', 1982),
        p('f', 'Trần Dũng', 1950)
      ],
      [child('f', '1'), child('f', '2')]
    )
    expect(groups.map(ids)).toEqual([['1', '2']])
  })

  test('does not group a different birth year without a shared parent', () => {
    const groups = groupPossibleDuplicates(
      [
        p('1', 'Trần Cường', 1980),
        p('2', 'Trần Cường', 1981),
        p('3', 'Trần Cường')
      ],
      [child('a', '1'), child('b', '2')]
    )
    expect(groups).toEqual([])
  })

  test('does not group members without a birth year on the name alone', () => {
    expect(groupPossibleDuplicates([p('1', 'An'), p('2', 'An')], [])).toEqual(
      []
    )
  })

  test('chains matches and counts relationships', () => {
    const groups = groupPossibleDuplicates(
      [p('1', 'An', 1990), p('2', 'An', 1990), p('3', 'An', 1991)],
      [
        child('f', '2'),
        child('f', '3'),
        { type: 'marriage', person_a: '2', person_b: 'w' }
      ]
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].members.map((m) => [m.id, m.relationshipCount])).toEqual([
      ['1', 0],
      ['2', 2],
      ['3', 1]
    ])
  })
})
