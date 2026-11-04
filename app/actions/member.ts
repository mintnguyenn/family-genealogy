'use server'

import { getIsAdmin } from '@/lib/auth'
import { getServerTranslations } from '@/lib/i18n/server'
import { isUuid } from '@/utils/uuid'

export async function deleteMemberProfile(memberId: string) {
  const { t } = await getServerTranslations()
  if (!isUuid(memberId)) return { error: t('invalidProfile') }
  if (!(await getIsAdmin())) return { error: t('memberDeleteAccessDenied') }
  return { error: t('databaseNotConnected') }
}

export async function updateDescendantGenerationsAction(
  personId: string,
  generationDelta: number
): Promise<{ success: true; warning?: string } | { error: string }> {
  const { t } = await getServerTranslations()
  if (!isUuid(personId)) return { error: t('invalidProfile') }
  if (!Number.isInteger(generationDelta) || Math.abs(generationDelta) > 100)
    return { error: t('invalidGenerationDelta') }
  if (!(await getIsAdmin())) return { error: t('memberEditAccessDenied') }
  if (generationDelta === 0) return { success: true }
  return { error: t('databaseNotConnected') }
}
