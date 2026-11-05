'use server'

import { getIsAdmin } from '@/lib/auth'
import { getPersons } from '@/lib/data'
import { performExcelWrite } from '@/lib/excelAction'
import { getServerTranslations } from '@/lib/i18n/server'
import {
  findLunarMismatches,
  parseRecomputeIds,
  recomputeLunarDeathDate,
  type DateParts,
  type LunarRecomputeRow
} from '@/utils/lunarRecompute'

export interface LunarRecomputeApplyResult {
  /** Rows whose lunar death date was replaced. */
  updated: number
  /** Rows left alone: deleted, already correct, or edited since the preview. */
  skipped: number
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

function sameDate(current: DateParts, preview?: DateParts) {
  return (
    preview?.year === current.year &&
    preview.month === current.month &&
    preview.day === current.day
  )
}

export async function applyLunarRecompute(
  preview: Pick<LunarRecomputeRow, 'id' | 'solar' | 'stored'>[]
): Promise<LunarRecomputeApplyResult | { error: string }> {
  const { t } = await getServerTranslations()
  const parsed = parseRecomputeIds(
    Array.isArray(preview) && preview.map((row) => row?.id)
  )
  if (!parsed) return { error: t('lunarRecomputeInvalidSelection') }
  const selected = new Map(preview.map((row) => [row.id.toLowerCase(), row]))
  const result = await performExcelWrite((data) => {
    let updated = 0
    for (const person of data.persons) {
      const expected = selected.get(person.id.toLowerCase())
      if (!expected) continue
      const row = recomputeLunarDeathDate(person)
      if (
        !row ||
        !sameDate(row.solar, expected.solar) ||
        !sameDate(row.stored, expected.stored)
      )
        continue
      person.death_lunar_year = row.recomputed.year
      person.death_lunar_month = row.recomputed.month
      person.death_lunar_day = row.recomputed.day
      updated++
    }
    return { updated, skipped: selected.size - updated }
  })
  return result.ok ? result.value : { error: result.error }
}
