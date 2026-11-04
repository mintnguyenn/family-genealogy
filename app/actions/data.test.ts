import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { getMessages } from '@/lib/i18n/messages'
import type { ImportPayload } from '@/utils/backupPayload'

const dictionary = getMessages('en')
let admin = false
mock.module('@/lib/auth', () => ({ getIsAdmin: async () => admin }))
mock.module('@/lib/i18n/server', () => ({
  getServerTranslations: async () => ({
    locale: 'en',
    t: (key: keyof typeof dictionary) => dictionary[key]
  })
}))

const { exportData, importData, appendImportData } = await import('./data')
const { deleteMemberProfile, updateDescendantGenerationsAction } =
  await import('./member')
const { checkTreeData } = await import('./dataCheck')
const { scanPossibleDuplicates } = await import('./duplicateScan')
const { previewLunarRecompute, applyLunarRecompute } =
  await import('./lunarRecompute')
const { mergePersons } = await import('./mergePersons')
const id = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const payload: ImportPayload = {
  persons: [
    {
      id,
      full_name: 'Preview',
      gender: 'male',
      birth_year: null,
      birth_month: null,
      birth_day: null,
      death_year: null,
      death_month: null,
      death_day: null,
      death_lunar_year: null,
      death_lunar_month: null,
      death_lunar_day: null,
      is_deceased: false,
      is_in_law: false,
      birth_order: null,
      generation: null,
      other_names: null,
      avatar_url: null,
      note: null
    }
  ],
  relationships: [],
  person_details_private: [],
  custom_events: []
}

beforeEach(() => {
  admin = false
})

describe('local admin data actions without persistence', () => {
  test('guests cannot export or run admin scans', async () => {
    for (const run of [
      () => exportData(),
      checkTreeData,
      scanPossibleDuplicates,
      previewLunarRecompute
    ]) {
      expect(await run()).toEqual({ error: dictionary.dataAccessDenied })
    }
  })

  test('an admin can export and inspect the empty tree', async () => {
    admin = true
    const result = await exportData()
    expect(result).toMatchObject({
      persons: [],
      relationships: [],
      custom_events: []
    })
    expect(await scanPossibleDuplicates()).toEqual({ groups: [], remaining: 0 })
    expect(await previewLunarRecompute()).toEqual({ rows: [] })
  })

  test('writes report unavailable persistence instead of succeeding', async () => {
    admin = true
    for (const run of [
      () => importData(payload),
      () => appendImportData(payload),
      () => deleteMemberProfile(id),
      () => updateDescendantGenerationsAction(id, 1),
      () => applyLunarRecompute([id]),
      () => mergePersons(id, other)
    ]) {
      expect(await run()).toEqual({ error: dictionary.databaseNotConnected })
    }
  })

  test('member actions still validate ids and admin permissions', async () => {
    expect(await deleteMemberProfile(id)).toEqual({
      error: dictionary.memberDeleteAccessDenied
    })
    expect(await updateDescendantGenerationsAction(id, 1)).toEqual({
      error: dictionary.memberEditAccessDenied
    })
    admin = true
    expect(await deleteMemberProfile('invalid')).toEqual({
      error: dictionary.invalidProfile
    })
    expect(await updateDescendantGenerationsAction(id, 1.5)).toEqual({
      error: dictionary.invalidGenerationDelta
    })
  })
})
