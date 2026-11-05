'use server'

import { redirect } from 'next/navigation'

import { getIsAdmin } from '@/lib/auth'
import { performExcelWrite } from '@/lib/excelAction'
import { removePerson, shiftDescendants } from '@/lib/familyMutations'
import { getServerTranslations } from '@/lib/i18n/server'
import { removeUnusedImage } from '@/lib/localImages'
import { isUuid } from '@/utils/uuid'

export async function deleteMemberProfile(memberId: string) {
  const { t } = await getServerTranslations()
  if (!isUuid(memberId)) return { error: t('invalidProfile') }
  let avatar: string | null | undefined
  const result = await performExcelWrite((data) => {
    avatar = data.persons.find((person) => person.id === memberId)?.avatar_url
    removePerson(data, memberId)
  }, t('memberDeleteAccessDenied'))
  if (!result.ok) return { error: result.error }
  await removeUnusedImage(avatar).catch((error) =>
    console.error('Could not clean up deleted avatar:', error)
  )
  redirect('/dashboard/members')
}

export async function updateDescendantGenerationsAction(
  personId: string,
  generationDelta: number
): Promise<{ success: true; warning?: string } | { error: string }> {
  const { t } = await getServerTranslations()
  if (!isUuid(personId)) return { error: t('invalidProfile') }
  if (!Number.isInteger(generationDelta) || Math.abs(generationDelta) > 100)
    return { error: t('invalidGenerationDelta') }
  if (generationDelta === 0)
    return (await getIsAdmin())
      ? { success: true }
      : { error: t('memberEditAccessDenied') }
  const result = await performExcelWrite(
    (data) => shiftDescendants(data, personId, generationDelta),
    t('memberEditAccessDenied')
  )
  return result.ok ? { success: true } : { error: result.error }
}
