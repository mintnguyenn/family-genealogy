'use server'

import { getIsAdmin } from '@/lib/auth'
import { getPersons, getRelationships } from '@/lib/data'
import { getServerTranslations } from '@/lib/i18n/server'
import {
  groupPossibleDuplicates,
  type DuplicateGroup
} from '@/utils/duplicatePeople'

/** Groups returned to the page; the rest are only counted. */
const MAX_DUPLICATE_GROUPS = 200

export interface DuplicateScanResult {
  groups: DuplicateGroup[]
  /** Groups found beyond `MAX_DUPLICATE_GROUPS`. */
  remaining: number
}

/**
 * Scans the whole tree for members that may be the same person. Read-only
 * (two selects, nothing is written); admins only.
 */
export async function scanPossibleDuplicates(): Promise<
  DuplicateScanResult | { error: string }
> {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) return { error: t('dataAccessDenied') }

  const [persons, relationships] = await Promise.all([
    getPersons(),
    getRelationships()
  ])

  const groups = groupPossibleDuplicates(persons, relationships)
  return {
    groups: groups.slice(0, MAX_DUPLICATE_GROUPS),
    remaining: Math.max(0, groups.length - MAX_DUPLICATE_GROUPS)
  }
}
