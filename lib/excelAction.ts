import { revalidatePath } from 'next/cache'

import { getIsAdmin } from '@/lib/auth'
import { updateFamilyWorkbook, type FamilyData } from '@/lib/excel'
import { getServerTranslations } from '@/lib/i18n/server'
import {
  RelationshipValidationError,
  RelationshipWarningError
} from '@/utils/relationshipValidation'
import type { WriteResult } from '@/utils/writeErrors'

export async function performExcelWrite<T>(
  change: (data: FamilyData, timestamp: string) => T | Promise<T>,
  deniedMessage?: string
): Promise<WriteResult<T>> {
  const { t } = await getServerTranslations()
  if (!(await getIsAdmin()))
    return { ok: false, error: deniedMessage ?? t('dataAccessDenied') }
  let value: T
  try {
    value = await updateFamilyWorkbook(change)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      kind: error instanceof Error ? error.name : undefined,
      detail:
        error instanceof RelationshipValidationError
          ? error.code
          : error instanceof RelationshipWarningError
            ? error.issue
            : undefined
    }
  }
  // A cache refresh failure must not invite a second save of committed data.
  try {
    revalidatePath('/dashboard', 'layout')
  } catch (error) {
    console.error('Workbook saved, but cache refresh failed:', error)
  }
  return { ok: true, value }
}
