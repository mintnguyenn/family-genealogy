'use server'

import { getIsAdmin } from '@/lib/auth'
import {
  getPersonById,
  getPersons,
  getPrivateDetails,
  getRelationships
} from '@/lib/data'
import { getServerTranslations } from '@/lib/i18n/server'
import {
  mergeIdsProblem,
  previewMerge,
  type MergePreview
} from '@/utils/mergePersons'

/** Counts reported by a completed merge. */
export interface MergeSummary {
  relationships_moved: number
  relationships_dropped: number
  details_fields_filled: number
  person_fields_filled: number
}

export async function loadMergePreview(
  keepId: string,
  dropId: string
): Promise<MergePreview | { error: string }> {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) return { error: t('dataAccessDenied') }
  const problem = mergeIdsProblem(keepId, dropId)
  if (problem)
    return {
      error: t(problem === 'same' ? 'mergeSameMember' : 'mergeInvalidMember')
    }
  const [keep, drop, persons, relationships, privateKeep, privateDrop] =
    await Promise.all([
      getPersonById(keepId),
      getPersonById(dropId),
      getPersons(),
      getRelationships(),
      getPrivateDetails(keepId),
      getPrivateDetails(dropId)
    ])
  if (!keep || !drop) return { error: t('mergeInvalidMember') }
  return previewMerge({
    keep,
    drop,
    relationships: relationships.filter((r) =>
      [r.person_a, r.person_b].some((id) => id === keepId || id === dropId)
    ),
    privateKeep,
    privateDrop,
    lineage: relationships.filter((r) => r.type !== 'marriage'),
    genders: Object.fromEntries(persons.map((p) => [p.id, p.gender]))
  })
}
export async function mergePersons(
  keepId: string,
  dropId: string
): Promise<{ summary: MergeSummary } | { error: string }> {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) return { error: t('dataAccessDenied') }
  const problem = mergeIdsProblem(keepId, dropId)
  if (problem)
    return {
      error: t(problem === 'same' ? 'mergeSameMember' : 'mergeInvalidMember')
    }
  return { error: t('databaseNotConnected') }
}
