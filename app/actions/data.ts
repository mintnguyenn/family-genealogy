'use server'

import { getIsAdmin } from '@/lib/auth'
import {
  getCustomEvents,
  getGalleryItems,
  getPersons,
  getPrivateDetails,
  getRelationships
} from '@/lib/data'
import { performExcelWrite } from '@/lib/excelAction'
import { importFamily } from '@/lib/familyMutations'
import { getServerTranslations } from '@/lib/i18n/server'
import {
  BACKUP_VERSION,
  toCustomEventExport,
  toPersonExport,
  type BackupPayload,
  type ImportPayload,
  type RestoreCounts
} from '@/utils/backupPayload'
import { filterBranch } from '@/utils/branchExport'

export async function exportData(
  exportRootId?: string
): Promise<BackupPayload | { error: string }> {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) return { error: t('dataAccessDenied') }
  const [persons, relationships, events, gallery] = await Promise.all([
    getPersons(),
    getRelationships(),
    getCustomEvents(),
    getGalleryItems()
  ])
  const details = (
    await Promise.all(persons.map((p) => getPrivateDetails(p.id)))
  ).filter((p) => p !== null)
  const branch = filterBranch(
    { persons: persons.map(toPersonExport), relationships, details },
    exportRootId
  )
  const exportedIds = new Set(branch.persons.map((person) => person.id))
  return {
    version: BACKUP_VERSION,
    timestamp: new Date().toISOString(),
    persons: branch.persons,
    relationships: branch.relationships,
    person_details_private: branch.details,
    custom_events: events.map(toCustomEventExport),
    gallery_item_persons: gallery.flatMap((item) =>
      (item.person_ids ?? [])
        .filter((id) => exportedIds.has(id))
        .map((person_id) => ({
          gallery_item_id: item.id,
          person_id
        }))
    )
  }
}

type ImportResult =
  { success: true; imported: RestoreCounts } | { error: string }

export async function importData(
  payload: ImportPayload
): Promise<ImportResult> {
  const result = await performExcelWrite((data, timestamp) =>
    importFamily(data, payload, false, timestamp)
  )
  return result.ok
    ? { success: true, imported: result.value }
    : { error: result.error }
}

export async function appendImportData(
  payload: ImportPayload
): Promise<ImportResult> {
  const result = await performExcelWrite((data, timestamp) =>
    importFamily(data, payload, true, timestamp)
  )
  return result.ok
    ? { success: true, imported: result.value }
    : { error: result.error }
}
