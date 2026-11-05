import { describe, expect, it } from 'bun:test'

import {
  buildDescendantGenerationUpdates,
  buildLineageUpdates,
  collectDescendants
} from '@/utils/generationUpdates'
import type { ComputedUpdate } from '@/utils/lineageCompute'

function lineageRow(
  id: string,
  changed: boolean,
  extra: Partial<ComputedUpdate> = {}
): ComputedUpdate {
  return {
    id,
    full_name: id,
    old_generation: 1,
    new_generation: 2,
    old_birth_order: null,
    new_birth_order: 1,
    old_is_in_law: false,
    new_is_in_law: false,
    gender: 'male',
    changed,
    ...extra
  }
}

const link = (parent: string, child: string, type = 'biological_child') => ({
  person_a: parent,
  person_b: child,
  type
})

describe('collectDescendants', () => {
  it('finds every descendant of a three-generation tree, nearest first', () => {
    const relationships = [
      link('root', 'son'),
      link('root', 'daughter'),
      link('son', 'grandson'),
      link('daughter', 'granddaughter'),
      link('other', 'stranger')
    ]
    expect(collectDescendants(relationships, 'root')).toEqual([
      'son',
      'daughter',
      'grandson',
      'granddaughter'
    ])
    expect(collectDescendants(relationships, 'grandson')).toEqual([])
  })

  it('follows adopted and biological children and lists a child of two parents once', () => {
    const relationships = [
      link('root', 'child'),
      link('wife', 'child'),
      link('root', 'adopted', 'adopted_child'),
      link('child', 'grandchild'),
      link('adopted', 'grandchild')
    ]
    expect(collectDescendants(relationships, 'root')).toEqual([
      'child',
      'adopted',
      'grandchild'
    ])
    expect(collectDescendants(relationships, 'wife')).toEqual([
      'child',
      'grandchild'
    ])
  })

  it('never includes the root when old data loops back to it', () => {
    const relationships = [
      link('root', 'child'),
      link('child', 'grandchild'),
      link('grandchild', 'root'),
      link('root', 'root')
    ]
    const ids = collectDescendants(relationships, 'root')
    expect(ids).toEqual(['child', 'grandchild'])
    expect(ids).not.toContain('root')
  })
})

describe('buildDescendantGenerationUpdates', () => {
  it('shifts generations, never below 1, and skips members without one', () => {
    expect(
      buildDescendantGenerationUpdates(
        [
          { id: 'a', generation: 3 },
          { id: 'b', generation: 1 },
          { id: 'c', generation: null }
        ],
        -1
      )
    ).toEqual([
      { id: 'a', generation: 2 },
      { id: 'b', generation: 1 }
    ])
  })

  it('only sends the generation column', () => {
    const [row] = buildDescendantGenerationUpdates(
      [{ id: 'a', generation: 2 }],
      2
    )
    expect(Object.keys(row).sort()).toEqual(['generation', 'id'])
  })
})

describe('buildLineageUpdates', () => {
  it('keeps changed rows with the three lineage columns', () => {
    expect(
      buildLineageUpdates([
        lineageRow('a', true, { new_generation: null, new_is_in_law: true }),
        lineageRow('b', false)
      ])
    ).toEqual([{ id: 'a', generation: null, birth_order: 1, is_in_law: true }])
  })
})
