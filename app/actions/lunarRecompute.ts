'use server'

import { getIsAdmin } from '@/lib/auth'
import { getPersons } from '@/lib/data'
import { getServerTranslations } from '@/lib/i18n/server'
import {
  findLunarMismatches,
  parseRecomputeIds,
  type LunarRecomputeRow
} from '@/utils/lunarRecompute'

export interface LunarRecomputeApplyResult {
  /** Rows whose lunar death date was replaced. */
  updated: number
  /** Rows left alone: deleted, already correct, or edited since the preview. */
  skipped: number
  /** Rows the database refused to update. */
  failed: number
}

export async function previewLunarRecompute(): Promise<
  { rows: LunarRecomputeRow[] } | { error: string }
> {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) return { error: t('dataAccessDenied') }
  return {
    rows: findLunarMismatches(await getPersons()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName, 'vi')
    )
  }
}
export async function applyLunarRecompute(
  ids: string[]
): Promise<LunarRecomputeApplyResult | { error: string }> {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) return { error: t('dataAccessDenied') }
  if (!parseRecomputeIds(ids))
    return { error: t('lunarRecomputeInvalidSelection') }
  return { error: t('databaseNotConnected') }
}
