'use server'

import { getIsAdmin } from '@/lib/auth'
import {
  getCustomEvents,
  getPersons,
  getPrivateDetails,
  getRelationships
} from '@/lib/data'
import { getServerTranslations } from '@/lib/i18n/server'
import {
  BACKUP_VERSION,
  toCustomEventExport,
  toPersonExport,
  validateImportPayload,
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
  const [persons, relationships, events] = await Promise.all([
    getPersons(),
    getRelationships(),
    getCustomEvents()
  ])
  const details = (
    await Promise.all(persons.map((p) => getPrivateDetails(p.id)))
  ).filter((p) => p !== null)
  const branch = filterBranch(
    { persons: persons.map(toPersonExport), relationships, details },
    exportRootId
  )
  return {
    version: BACKUP_VERSION,
    timestamp: new Date().toISOString(),
    persons: branch.persons,
    relationships: branch.relationships,
    person_details_private: branch.details,
    custom_events: events.map(toCustomEventExport)
  }
}

type ImportResult =
  | { success: true; imported: RestoreCounts; warning?: string }
  | { error: string }

export async function importData(
  payload: ImportPayload
): Promise<ImportResult> {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) return { error: t('dataAccessDenied') }
  const error = validateImportPayload(payload, t)
  return { error: error ?? t('databaseNotConnected') }
}

export async function appendImportData(
  payload: ImportPayload
): Promise<ImportResult> {
  return importData(payload)
}
