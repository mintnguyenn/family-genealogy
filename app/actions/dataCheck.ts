'use server'

import { getIsAdmin } from '@/lib/auth'
import { getPersons, getRelationships } from '@/lib/data'
import { getServerTranslations } from '@/lib/i18n/server'
import {
  DATA_CHECK_KINDS,
  runDataChecks,
  type DataCheckFinding,
  type DataCheckKind
} from '@/utils/dataChecks'

/** Findings of one kind returned to the page; the rest are only counted. */
const MAX_FINDINGS_PER_KIND = 200

export interface DataCheckResult {
  /** At most `MAX_FINDINGS_PER_KIND` of each kind. */
  findings: DataCheckFinding[]
  /** Every finding of each kind, shown or not. */
  counts: Record<DataCheckKind, number>
}

/**
 * Checks the whole tree for impossible dates, repeated relationships and missing basics.
 * Read-only; admins only.
 */
export async function checkTreeData(): Promise<
  DataCheckResult | { error: string }
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

  const all = runDataChecks(persons, relationships)
  const counts = Object.fromEntries(
    DATA_CHECK_KINDS.map((kind) => [kind, 0])
  ) as Record<DataCheckKind, number>
  const findings = all.filter((f) => ++counts[f.kind] <= MAX_FINDINGS_PER_KIND)
  return { findings, counts }
}
