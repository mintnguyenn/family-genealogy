'use server'

import { getIsAdmin } from '@/lib/auth'
import { getPersons } from '@/lib/data'
import { performExcelWrite } from '@/lib/excelAction'
import { getServerTranslations } from '@/lib/i18n/server'
import {
  findLunarMismatches,
  parseRecomputeIds,
  recomputeLunarDeathDate,
  type LunarRecomputeRow
} from '@/utils/lunarRecompute'

export interface LunarRecomputeApplyResult {
  /** Rows whose lunar death date was replaced. */
  updated: number
  /** Rows left alone: deleted, already correct, or edited since the preview. */
  skipped: number
  /** Kept for the existing results UI; workbook writes are atomic. */
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
  const { t } = await getServerTranslations()
  const parsed = parseRecomputeIds(ids)
  if (!parsed) return { error: t('lunarRecomputeInvalidSelection') }
  const selected = new Set(parsed)
  const result = await performExcelWrite((data) => {
    let updated = 0
    for (const person of data.persons) {
      if (!selected.has(person.id)) continue
      const row = recomputeLunarDeathDate(person)
      if (!row) continue
      person.death_lunar_year = row.recomputed.year
      person.death_lunar_month = row.recomputed.month
      person.death_lunar_day = row.recomputed.day
      updated++
    }
    return { updated, skipped: selected.size - updated, failed: 0 }
  })
  return result.ok ? result.value : { error: result.error }
}
