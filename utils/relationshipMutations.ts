import {
  addRelationshipToExcel,
  createChildrenInExcel,
  createSpouseInExcel,
  deleteRelationshipFromExcel
} from '@/app/actions/excel'
import type { BulkChildRow } from '@/components/relationship/relationshipTypes'
import type { TranslationKey } from '@/lib/i18n/messages'
import type { Person, RelationshipType } from '@/types'
import { vnToday } from '@/utils/dateHelpers'
import { checkTextLength, MAX_NAME } from '@/utils/limits'
import { memberSearchCache } from '@/utils/memberSearchCache'
import {
  RELATIONSHIP_WARNING_KEYS,
  RelationshipValidationError,
  RelationshipWarningError,
  validateNewChildren,
  type DatedPerson,
  type RelationshipValidationCode
} from '@/utils/relationshipValidation'
import { unwrapWriteResult } from '@/utils/writeErrors'

export type RelationshipDirection = 'parent' | 'child' | 'spouse'

const MAX_INT = 2147483647

export interface NewRelationshipInput {
  personId: string
  selectedTargetId: string
  direction: RelationshipDirection
  relType: RelationshipType
  note: string
  /** Save even when the link only looks wrong (RelationshipWarningError). */
  acceptWarnings?: boolean
}

// A whole number written with digits only: "12abc", "-5" and "1990.5" are not.
function parseWholeNumber(value: string): number | null {
  const text = value.trim()
  if (!/^\d+$/.test(text)) return null
  const number = Number(text)
  return number <= MAX_INT ? number : null
}

// Empty means unknown (null); anything that is not a whole number gives NaN,
// which validateChildRow rejects.
export function parseBirthYear(value: string): number | null {
  if (value.trim() === '') return null
  return parseWholeNumber(value) ?? NaN
}

function parseBirthOrder(value: string): number | null {
  if (value.trim() === '') return null
  return parseWholeNumber(value) ?? NaN
}

/**
 * Checks the birth year and birth order a row would save, like the member
 * form does for a single member: whole numbers only, a year from 1 up to the
 * current year (Vietnam time), a birth order from 1.
 */
export function validateChildRow(
  row: Pick<BulkChildRow, 'birthYear' | 'birthOrder'>,
  today: Date = vnToday()
): RelationshipValidationCode | null {
  const year = parseBirthYear(row.birthYear)
  if (year != null) {
    if (Number.isNaN(year) || year < 1) return 'invalidBirthYear'
    if (year > today.getFullYear()) return 'birthYearInFuture'
  }
  const order = parseBirthOrder(row.birthOrder)
  if (order != null && (Number.isNaN(order) || order < 1))
    return 'invalidBirthOrder'
  return null
}

export async function saveWithWarningConfirmation(
  save: (acceptWarnings: boolean) => Promise<unknown>,
  confirm: (key: TranslationKey) => boolean
) {
  try {
    await save(false)
  } catch (error) {
    if (!(error instanceof RelationshipWarningError)) throw error
    if (!confirm(RELATIONSHIP_WARNING_KEYS[error.issue])) return false
    await save(true)
  }
  return true
}

export interface BulkCreateResult {
  created: number
}

export interface SpouseInput {
  person: Person
  name: string
  birthYear: string
  note: string
  acceptWarnings?: boolean
}

export async function addRelationshipWithTargetSync(
  input: NewRelationshipInput
): Promise<void> {
  return unwrapWriteResult(await addRelationshipToExcel(input))
}
export async function deleteRelationship(id: string): Promise<void> {
  return unwrapWriteResult(await deleteRelationshipFromExcel(id))
}
export async function createSpouseWithMarriage(
  input: SpouseInput
): Promise<string> {
  const id = unwrapWriteResult(await createSpouseInExcel(input))
  memberSearchCache.clear()
  return id
}
export async function bulkCreateChildren(input: {
  children: BulkChildRow[]
  parentId: string
  otherParentId: string
  parents: DatedPerson[]
  acceptWarnings?: boolean
}): Promise<BulkCreateResult> {
  for (const row of input.children) {
    const problem = validateChildRow(row)
    if (problem) throw new RelationshipValidationError(problem, row.name.trim())
    checkTextLength('fullName', row.name, MAX_NAME)
  }
  const problem = validateNewChildren(
    input.parents,
    input.children.map((row) => ({ birthYear: parseBirthYear(row.birthYear) }))
  )
  if (problem)
    throw new RelationshipValidationError(
      problem.code,
      input.children[problem.index].name.trim()
    )
  const result = unwrapWriteResult(await createChildrenInExcel(input))
  memberSearchCache.clear()
  return result
}
