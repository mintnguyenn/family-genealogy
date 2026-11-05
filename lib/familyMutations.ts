import { randomUUID } from 'node:crypto'

import type { BulkChildRow } from '@/components/relationship/relationshipTypes'
import type { FamilyData } from '@/lib/excel'
import { translate } from '@/lib/i18n/messages'
import type { Gender, Person, Relationship } from '@/types'
import { remapImportIds } from '@/utils/appendImport'
import {
  sanitizeCustomEvent,
  sanitizePerson,
  sanitizePrivateDetails,
  validateImportPayload,
  type ImportPayload,
  type PersonExport
} from '@/utils/backupPayload'
import {
  buildDescendantGenerationUpdates,
  collectDescendants,
  type GenerationUpdate
} from '@/utils/generationUpdates'
import { checkTextLength, MAX_NAME } from '@/utils/limits'
import type {
  SaveMemberOptions,
  SaveMemberResult
} from '@/utils/memberForm/types'
import {
  buildPersonData,
  findTooLongText,
  validateMemberForm
} from '@/utils/memberFormHelpers'
import { previewMerge, splitOtherNames } from '@/utils/mergePersons'
import type {
  BulkCreateResult,
  NewRelationshipInput,
  SpouseInput
} from '@/utils/relationshipMutations'
import {
  findBirthDateConflict,
  findParentDeathIssues,
  RelationshipValidationError,
  relationshipWarning,
  RelationshipWarningError,
  validateNewChildren,
  validateRelationship
} from '@/utils/relationshipValidation'
import { PersonChangedError, PersonNotUpdatedError } from '@/utils/writeErrors'

function requirePerson(data: FamilyData, id: string) {
  const person = data.persons.find((person) => person.id === id)
  if (!person) throw new PersonNotUpdatedError()
  return person
}

function newPerson(
  data: FamilyData,
  fields: Partial<Person> & { full_name: string },
  timestamp: string
) {
  const person: Person = {
    ...sanitizePerson({
      id: randomUUID(),
      gender: 'other',
      ...fields
    } as PersonExport),
    created_at: timestamp,
    updated_at: timestamp
  }
  data.persons.push(person)
  return person
}

export function applyGenerations(
  data: FamilyData,
  updates: GenerationUpdate[]
) {
  for (const update of updates) {
    const person = requirePerson(data, update.id)
    for (const field of ['generation', 'birth_order'] as const) {
      const value = update[field]
      if (value !== undefined) {
        if (value !== null && (!Number.isInteger(value) || value < 1))
          throw new Error('Đời và thứ tự sinh phải là số nguyên dương.')
        person[field] = value
      }
    }
    if (update.is_in_law !== undefined) {
      if (typeof update.is_in_law !== 'boolean')
        throw new Error('Giá trị dâu/rể không hợp lệ.')
      person.is_in_law = update.is_in_law
    }
  }
  return updates.length
}

export function shiftDescendants(data: FamilyData, id: string, delta: number) {
  const ids = new Set(
    collectDescendants(
      data.relationships.filter((r) => r.type !== 'marriage'),
      id
    )
  )
  return applyGenerations(
    data,
    buildDescendantGenerationUpdates(
      data.persons.filter((p) => ids.has(p.id)),
      delta
    )
  )
}

export function savePerson(
  data: FamilyData,
  options: SaveMemberOptions,
  timestamp: string
): SaveMemberResult {
  const fields = {
    ...options.fields,
    deathDay: options.deathValues.day,
    deathMonth: options.deathValues.month,
    deathYear: options.deathValues.year,
    deathLunarDay: options.deathValues.lunarDay,
    deathLunarMonth: options.deathValues.lunarMonth,
    deathLunarYear: options.deathValues.lunarYear
  }
  const problem = validateMemberForm(
    fields.birthDay,
    fields.birthMonth,
    fields.birthYear,
    fields.isDeceased,
    options.deathValues,
    fields.fullName,
    undefined,
    fields
  )
  if (problem) throw new Error(translate('vi', problem))
  const long = findTooLongText({ ...fields, ...options.privateFields })
  if (long)
    throw new Error(
      translate('vi', 'textTooLong', {
        field: translate('vi', long.label),
        max: long.max
      })
    )
  const before = options.isEditing
    ? requirePerson(data, options.initialData?.id ?? '')
    : undefined
  if (before && before.updated_at !== options.initialData?.updated_at)
    throw new PersonChangedError()
  const oldGeneration = before?.generation ?? 0
  const personFields = buildPersonData(
    fields,
    options.avatarFile
      ? options.avatarUrl || null
      : options.removeExistingAvatar
        ? null
        : options.avatarUrl || null,
    Boolean(before?.burial_place)
  )
  const person =
    before ?? newPerson(data, { full_name: fields.fullName }, timestamp)
  Object.assign(person, personFields, { updated_at: timestamp })
  const relatives = (
    side: 'person_a' | 'person_b',
    other: 'person_a' | 'person_b'
  ) =>
    data.relationships
      .filter((r) => r.type === 'biological_child' && r[side] === person.id)
      .map((r) => requirePerson(data, r[other]))
  const parents = relatives('person_b', 'person_a'),
    children = relatives('person_a', 'person_b')
  const conflict = findBirthDateConflict(person, parents, children)
  if (conflict)
    throw new Error(
      translate(
        'vi',
        conflict.relation === 'parent'
          ? 'memberBornBeforeParent'
          : 'memberBornAfterChild',
        { name: conflict.name }
      )
    )
  const death = findParentDeathIssues(person, parents, children).find(
    (issue) => issue.issue === 'motherDiedBeforeBirth'
  )
  if (death)
    throw new Error(
      translate('vi', 'memberMotherDiedBeforeBirth', {
        parent: death.parent,
        child: death.child
      })
    )
  if (options.privateLoaded !== false) {
    const detail = {
      person_id: person.id,
      phone_number: options.privateFields.phoneNumber.trim() || null,
      occupation: options.privateFields.occupation.trim() || null,
      current_residence: options.privateFields.currentResidence.trim() || null
    }
    data.person_details_private = data.person_details_private.filter(
      (row) => row.person_id !== person.id
    )
    if (detail.phone_number || detail.occupation || detail.current_residence)
      data.person_details_private.push(detail)
  }
  if (before && options.updateDescendantGenerations && fields.generation !== '')
    shiftDescendants(data, person.id, Number(fields.generation) - oldGeneration)
  return {
    personId: person.id,
    generationUpdateError: null,
    warnings: [],
    savedUpdatedAt: timestamp,
    ...(!before ? { createdPerson: person } : {})
  }
}

function appendRelationship(
  data: FamilyData,
  candidate: Pick<Relationship, 'person_a' | 'person_b' | 'type'>,
  timestamp: string,
  note: string | null = null,
  acceptWarnings = false
) {
  requirePerson(data, candidate.person_a)
  requirePerson(data, candidate.person_b)
  const problem = validateRelationship(
    data.persons,
    data.relationships,
    candidate
  )
  if (problem) throw new RelationshipValidationError(problem)
  const warning = relationshipWarning(
    data.persons,
    candidate,
    data.relationships
  )
  if (warning && !acceptWarnings) throw new RelationshipWarningError(warning)
  data.relationships.push({
    ...candidate,
    id: randomUUID(),
    note,
    created_at: timestamp,
    updated_at: timestamp
  })
}

export function addFamilyRelationship(
  data: FamilyData,
  input: NewRelationshipInput,
  timestamp: string
) {
  const person = requirePerson(data, input.personId),
    target = requirePerson(data, input.selectedTargetId)
  const type = input.direction === 'spouse' ? 'marriage' : input.relType
  if (
    input.direction !== 'spouse' &&
    !['biological_child', 'adopted_child'].includes(type)
  )
    throw new Error('Loại quan hệ không hợp lệ.')
  if (!['parent', 'child', 'spouse'].includes(input.direction))
    throw new Error('Chiều quan hệ không hợp lệ.')
  appendRelationship(
    data,
    {
      type,
      person_a: input.direction === 'parent' ? target.id : person.id,
      person_b: input.direction === 'parent' ? person.id : target.id
    },
    timestamp,
    input.note || null,
    input.acceptWarnings
  )
  const missingGeneration = target.generation == null
  if (missingGeneration && person.generation != null)
    target.generation = Math.max(
      1,
      person.generation +
        (input.direction === 'parent'
          ? -1
          : input.direction === 'child'
            ? 1
            : 0)
    )
  if (target.is_in_law == null)
    target.is_in_law =
      input.direction === 'spouse' ? person.is_in_law !== true : false
  return { targetUpdateError: null }
}

function birthYear(text: string) {
  if (!text.trim()) return null
  if (!/^\d+$/.test(text) || Number(text) < 1)
    throw new RelationshipValidationError('invalidBirthYear')
  if (Number(text) > new Date().getFullYear())
    throw new RelationshipValidationError('birthYearInFuture')
  return Number(text)
}

export function createFamilySpouse(
  data: FamilyData,
  input: SpouseInput,
  timestamp: string
) {
  const person = requirePerson(data, input.person.id)
  checkTextLength('fullName', input.name, MAX_NAME)
  const gender: Gender =
    person.gender === 'male'
      ? 'female'
      : person.gender === 'female'
        ? 'male'
        : 'female'
  const spouse = newPerson(
    data,
    {
      full_name: input.name.trim(),
      gender,
      birth_year: birthYear(input.birthYear),
      generation: person.generation,
      is_in_law: person.is_in_law !== true
    },
    timestamp
  )
  appendRelationship(
    data,
    { person_a: person.id, person_b: spouse.id, type: 'marriage' },
    timestamp,
    input.note || null
  )
  return spouse.id
}

export function createFamilyChildren(
  data: FamilyData,
  input: { children: BulkChildRow[]; parentId: string; otherParentId: string },
  timestamp: string
): BulkCreateResult {
  if (!input.children.length || input.children.length > 100)
    throw new Error('Danh sách con phải có từ 1 đến 100 người.')
  const parents = [requirePerson(data, input.parentId)]
  if (input.otherParentId)
    parents.push(requirePerson(data, input.otherParentId))
  const problem = validateNewChildren(
    parents,
    input.children.map((child) => ({ birthYear: birthYear(child.birthYear) }))
  )
  if (problem) throw new RelationshipValidationError(problem.code)
  for (const child of input.children) {
    checkTextLength('fullName', child.name, MAX_NAME)
    if (
      child.birthOrder &&
      (!/^\d+$/.test(child.birthOrder) || Number(child.birthOrder) < 1)
    )
      throw new RelationshipValidationError('invalidBirthOrder')
    const person = newPerson(
      data,
      {
        full_name: child.name.trim(),
        gender: child.gender,
        birth_year: birthYear(child.birthYear),
        birth_order: child.birthOrder ? Number(child.birthOrder) : null,
        generation:
          parents[0].generation == null ? null : parents[0].generation + 1
      },
      timestamp
    )
    for (const parent of parents)
      appendRelationship(
        data,
        { person_a: parent.id, person_b: person.id, type: 'biological_child' },
        timestamp
      )
  }
  return { created: input.children.length, failures: [] }
}

export function removePerson(data: FamilyData, id: string) {
  requirePerson(data, id)
  data.persons = data.persons.filter((person) => person.id !== id)
  data.relationships = data.relationships.filter(
    (row) => row.person_a !== id && row.person_b !== id
  )
  data.person_details_private = data.person_details_private.filter(
    (row) => row.person_id !== id
  )
}

export function importFamily(
  data: FamilyData,
  input: ImportPayload,
  append: boolean,
  timestamp: string
) {
  const error = validateImportPayload(input, (key, values) =>
    translate('vi', key, values)
  )
  if (error) throw new Error(error)
  const payload = append
    ? remapImportIds(input, { taken: data.persons.map((p) => p.id) })
    : input
  if (!append) {
    data.persons = []
    data.relationships = []
    data.person_details_private = []
    data.custom_events = []
  }
  for (const person of payload.persons)
    newPerson(data, { ...sanitizePerson(person), id: person.id }, timestamp)
  data.relationships.push(
    ...payload.relationships.map((row) => ({
      ...row,
      id: randomUUID(),
      type: row.type as Relationship['type'],
      created_at: row.created_at ?? timestamp,
      updated_at: timestamp
    }))
  )
  data.person_details_private.push(
    ...(payload.person_details_private ?? []).map((row) => ({
      ...sanitizePrivateDetails(row)
    }))
  )
  data.custom_events.push(
    ...(payload.custom_events ?? []).map((row) => ({
      ...sanitizeCustomEvent(row),
      created_by: null
    }))
  )
  return {
    persons: payload.persons.length,
    relationships: payload.relationships.length,
    person_details_private: payload.person_details_private?.length ?? 0,
    custom_events: payload.custom_events?.length ?? 0
  }
}

export function mergeFamily(data: FamilyData, keepId: string, dropId: string) {
  const keep = requirePerson(data, keepId),
    drop = requirePerson(data, dropId)
  const privateKeep =
    data.person_details_private.find((row) => row.person_id === keepId) ?? null
  const privateDrop =
    data.person_details_private.find((row) => row.person_id === dropId) ?? null
  const preview = previewMerge({
    keep,
    drop,
    privateKeep,
    privateDrop,
    relationships: data.relationships,
    lineage: data.relationships.filter((row) => row.type !== 'marriage'),
    genders: Object.fromEntries(
      data.persons.map((person) => [person.id, person.gender])
    )
  })
  const columns = {
    birthYear: 'birth_year',
    birthMonth: 'birth_month',
    birthDay: 'birth_day',
    deathYear: 'death_year',
    deathMonth: 'death_month',
    deathDay: 'death_day',
    deathLunarYear: 'death_lunar_year',
    deathLunarMonth: 'death_lunar_month',
    deathLunarDay: 'death_lunar_day',
    isDeceased: 'is_deceased',
    isInLaw: 'is_in_law',
    birthOrder: 'birth_order',
    generation: 'generation',
    avatar: 'avatar_url',
    burialPlace: 'burial_place'
  } as const
  for (const fill of preview.personFills)
    Object.assign(keep, { [columns[fill.key]]: fill.value })
  const names = [
    ...splitOtherNames(keep.other_names),
    ...preview.otherNamesAdded
  ]
  keep.other_names = [...new Set(names)].join('; ') || null
  if (preview.noteAppended)
    keep.note = [keep.note, drop.note].filter(Boolean).join('\n\n')
  const removed = new Set(
    [...preview.droppedPair, ...preview.droppedDuplicates].map((row) => row.id)
  )
  data.relationships = data.relationships
    .filter((row) => !removed.has(row.id))
    .map((row) => ({
      ...row,
      person_a: row.person_a === dropId ? keepId : row.person_a,
      person_b: row.person_b === dropId ? keepId : row.person_b
    }))
  if (privateDrop) {
    const detail = {
      person_id: keepId,
      phone_number: privateKeep?.phone_number || privateDrop.phone_number,
      occupation: privateKeep?.occupation || privateDrop.occupation,
      current_residence:
        privateKeep?.current_residence || privateDrop.current_residence
    }
    data.person_details_private = data.person_details_private.filter(
      (row) => row.person_id !== keepId && row.person_id !== dropId
    )
    data.person_details_private.push(detail)
  }
  data.persons = data.persons.filter((person) => person.id !== dropId)
  return {
    relationships_moved: preview.moved.length,
    relationships_dropped: removed.size,
    details_fields_filled: preview.privateFills.length,
    person_fields_filled: preview.personFills.length
  }
}
