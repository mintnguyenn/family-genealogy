import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test
} from 'bun:test'
import ExcelJS from 'exceljs'

import {
  decodeWorkbook,
  readFamilyWorkbook,
  updateFamilyWorkbook
} from '@/lib/excel'
import { getMessages } from '@/lib/i18n/messages'
import type { ImportPayload } from '@/utils/backupPayload'
import { loadGalleryPage } from '@/utils/gallery'
import type { SaveMemberOptions } from '@/utils/memberForm/types'

const dictionary = getMessages('en')
let admin = false
mock.module('@/lib/auth', () => ({ getIsAdmin: async () => admin }))
mock.module('@/lib/i18n/server', () => ({
  getServerTranslations: async () => ({
    locale: 'en',
    t: (key: keyof typeof dictionary) => dictionary[key]
  })
}))
const nextCache = await import('next/cache')
let failRevalidation = false
mock.module('next/cache', () => ({
  ...nextCache,
  revalidatePath: () => {
    if (failRevalidation) throw new Error('Cache unavailable')
  }
}))

const { exportData, importData, appendImportData } = await import('./data')
const { deleteMemberProfile } = await import('./member')
const { checkTreeData } = await import('./dataCheck')
const { scanPossibleDuplicates } = await import('./duplicateScan')
const { previewLunarRecompute, applyLunarRecompute } =
  await import('./lunarRecompute')
const { mergePersons } = await import('./mergePersons')
const {
  saveMemberToExcel,
  addRelationshipToExcel,
  deleteRelationshipFromExcel,
  createSpouseInExcel,
  createChildrenInExcel,
  saveEventToExcel,
  deleteEventFromExcel,
  uploadGalleryToLocal,
  saveGalleryToExcel,
  deleteGalleryFromExcel
} = await import('./excel')
const { getPrivateDetails, getPersons } = await import('@/lib/data')
const id = '11111111-1111-4111-8111-111111111111'
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

let previousDataFile: string | undefined
let testDirectory: string
const mother = '22222222-2222-4222-8222-222222222222'
const children = [
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444'
]
const fixture = new ExcelJS.Workbook()
fixture.addWorksheet('persons').addRows([
  ['id', 'full_name', 'gender', 'birth_year', 'is_in_law', 'generation'],
  [id, 'Test father', 'male', 1980, false, 1],
  [mother, 'Test mother', 'female', 1982, true, 1],
  [children[0], 'Test son', 'male', 2010, false, 2],
  [children[1], 'Test daughter', 'female', 2014, false, 2]
])
fixture
  .addWorksheet('relationships')
  .addRows([
    ['id', 'type', 'person_a', 'person_b'],
    ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'marriage', id, mother],
    ...children.flatMap((child, i) =>
      [id, mother].map((parent, j) => [
        `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${2 + i * 2 + j}`,
        'biological_child',
        parent,
        child
      ])
    )
  ])
const sampleBytes = Buffer.from(await fixture.xlsx.writeBuffer())
beforeEach(async () => {
  admin = false
  failRevalidation = false
  previousDataFile = process.env.FAMILY_DATA_FILE
  testDirectory = await mkdtemp(join(tmpdir(), 'family-write-action-'))
  process.env.FAMILY_DATA_FILE = join(testDirectory, 'family.xlsx')
  await writeFile(process.env.FAMILY_DATA_FILE, sampleBytes)
})
afterEach(async () => {
  if (previousDataFile === undefined) delete process.env.FAMILY_DATA_FILE
  else process.env.FAMILY_DATA_FILE = previousDataFile
  if (dirname(testDirectory) !== resolve(tmpdir()))
    throw new Error('Unexpected test cleanup path')
  await rm(testDirectory, { recursive: true, force: true })
})

describe('local admin actions with writable Excel data', () => {
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

  test('an admin can export and inspect the sample family', async () => {
    admin = true
    const result = await exportData()
    expect('persons' in result && result.persons).toHaveLength(4)
    expect('relationships' in result && result.relationships).toHaveLength(5)
    expect(result).toMatchObject({ custom_events: [] })
    expect(await scanPossibleDuplicates()).toEqual({ groups: [], remaining: 0 })
    expect(await previewLunarRecompute()).toEqual({ rows: [] })
  })

  test('imports, appends, merges, applies date fixes and deletes persist to Excel', async () => {
    admin = true
    expect(await importData(payload)).toMatchObject({
      success: true,
      imported: { persons: 1 }
    })
    expect(await appendImportData(payload)).toMatchObject({
      success: true,
      imported: { persons: 1 }
    })
    const duplicate = (await readFamilyWorkbook()).persons.find(
      (person) => person.id !== id
    )!
    expect(await mergePersons(id, duplicate.id)).toHaveProperty('summary')
    expect((await readFamilyWorkbook()).persons).toHaveLength(1)
    expect(await applyLunarRecompute([id])).toEqual({
      updated: 0,
      skipped: 1,
      failed: 0
    })
    await expect(deleteMemberProfile(id)).rejects.toThrow()
    expect((await readFamilyWorkbook()).persons).toHaveLength(0)
  })

  test('member actions still validate ids and admin permissions', async () => {
    expect(await deleteMemberProfile(id)).toEqual({
      error: dictionary.memberDeleteAccessDenied
    })
    admin = true
    expect(await deleteMemberProfile('invalid')).toEqual({
      error: dictionary.invalidProfile
    })
  })

  test('imports only supported relationship fields and normalizes bad timestamps', async () => {
    admin = true
    const backup = await exportData()
    if ('error' in backup) throw new Error(backup.error)
    const imported = {
      ...backup,
      relationships: backup.relationships.map((row, index) => ({
        ...row,
        created_at: index === 0 ? 'not-a-date' : '2020-01-02T03:04:05.000Z',
        unexpected_column: 'must not be saved'
      }))
    }
    expect(await importData(imported)).toHaveProperty('success', true)
    const data = await readFamilyWorkbook()
    expect(Number.isNaN(Date.parse(data.relationships[0].created_at))).toBe(
      false
    )
    expect(data.relationships[1].created_at).toBe('2020-01-02T03:04:05.000Z')
    const workbook = await decodeWorkbook(
      await readFile(process.env.FAMILY_DATA_FILE!)
    )
    expect(
      workbook.getWorksheet('relationships')!.getRow(1).values
    ).not.toContain('unexpected_column')
  })

  test('sorts gallery dates newest first, with undated images last and stable ties', async () => {
    const ids = Array.from(
      { length: 5 },
      (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
    )
    await updateFamilyWorkbook((data) => {
      data.gallery = [
        ['2020-01-01', '2020-01-01T00:00:00Z'],
        ['2026-01-01', '2026-01-01T00:00:00Z'],
        ['2026-01-01', '2026-02-01T00:00:00Z'],
        [null, '2030-01-01T00:00:00Z'],
        ['2026-01-01', '2026-02-01T00:00:00Z']
      ].map(([event_date, created_at], i) => ({
        id: ids[i],
        title: 'Example',
        image_url: '/example.png',
        description: null,
        event_date,
        created_at: created_at!,
        created_by: null
      }))
    })
    expect((await loadGalleryPage(1)).items.map((item) => item.id)).toEqual([
      ids[2],
      ids[4],
      ids[1],
      ids[0],
      ids[3]
    ])
  })

  const options = (name: string): SaveMemberOptions => ({
    isEditing: false,
    fields: {
      fullName: name,
      gender: 'male',
      birthYear: 1990,
      birthMonth: '',
      birthDay: '',
      deathYear: '',
      deathMonth: '',
      deathDay: '',
      deathLunarYear: '',
      deathLunarMonth: '',
      deathLunarDay: '',
      isDeceased: false,
      isInLaw: false,
      birthOrder: '',
      generation: '',
      otherNames: '',
      note: '',
      burialPlace: ''
    },
    deathValues: {
      day: '',
      month: '',
      year: '',
      lunarDay: '',
      lunarMonth: '',
      lunarYear: ''
    },
    avatarUrl: '',
    avatarFile: null,
    removeExistingAvatar: false,
    privateFields: {
      phoneNumber: '0900123456',
      occupation: 'Engineer',
      currentResidence: ''
    },
    updateDescendantGenerations: false
  })

  test('guest writes are refused even when the client claims isAdmin', async () => {
    const before = await readFile(process.env.FAMILY_DATA_FILE!)
    const forgedOptions = { ...options('Guest cannot save'), isAdmin: true }
    const result = await saveMemberToExcel(forgedOptions)
    expect(result.ok).toBe(false)
    expect((await readFile(process.env.FAMILY_DATA_FILE!)).equals(before)).toBe(
      true
    )
  })

  test('reports a committed save as successful even if cache refresh fails', async () => {
    admin = true
    failRevalidation = true
    const log = spyOn(console, 'error').mockImplementation(() => {})
    try {
      const result = await saveEventToExcel({
        name: 'Saved once',
        event_date: '2026-12-01',
        content: null,
        location: null
      })
      expect(result.ok).toBe(true)
      expect((await readFamilyWorkbook()).custom_events).toHaveLength(1)
      expect(log).toHaveBeenCalled()
    } finally {
      log.mockRestore()
    }
  })

  test('rejects invalid gallery dates and ignores extra client fields', async () => {
    admin = true
    const fields = {
      title: ' Gallery example ',
      description: null,
      event_date: '2026-02-31',
      id: 'client-controlled-id'
    }
    const before = await readFile(process.env.FAMILY_DATA_FILE!)
    expect(
      (await saveGalleryToExcel({ fields, imagePath: '/example.png' })).ok
    ).toBe(false)
    expect((await readFile(process.env.FAMILY_DATA_FILE!)).equals(before)).toBe(
      true
    )
    fields.event_date = '2026-02-28'
    expect(
      (await saveGalleryToExcel({ fields, imagePath: '/example.png' })).ok
    ).toBe(true)
    const gallery = (await readFamilyWorkbook()).gallery
    expect(gallery).toHaveLength(1)
    expect(gallery[0].id).not.toBe(fields.id)
    expect(gallery[0].title).toBe('Gallery example')
    fields.event_date = ''
    expect(
      (await saveGalleryToExcel({ fields, imagePath: '/example.png' })).ok
    ).toBe(true)
    expect((await readFamilyWorkbook()).gallery[1].event_date).toBeNull()
  })

  test('creates, edits, detects stale forms and protects private details', async () => {
    admin = true
    const created = await saveMemberToExcel(options('Người kiểm thử'))
    if (!created.ok) throw new Error(created.error)
    const person = (await readFamilyWorkbook()).persons.find(
      (row) => row.id === created.value.personId
    )!
    expect(person.full_name).toBe('Người kiểm thử')
    expect(await getPrivateDetails(person.id)).toMatchObject({
      phone_number: '0900123456'
    })
    expect(
      (await getPersons()).find((row) => row.id === person.id)
    ).not.toHaveProperty('phone_number')
    const edit = {
      ...options('Đã chỉnh sửa'),
      isEditing: true,
      initialData: person
    }
    expect((await saveMemberToExcel(edit)).ok).toBe(true)
    const stale = await saveMemberToExcel(edit)
    expect(stale).toMatchObject({ ok: false, kind: 'PersonChangedError' })
    expect(
      (await readFamilyWorkbook()).persons.find((row) => row.id === person.id)
        ?.full_name
    ).toBe('Đã chỉnh sửa')
    admin = false
    expect(await getPrivateDetails(person.id)).toBeNull()
  })

  test('adds/removes relationships and creates spouses and children atomically', async () => {
    admin = true
    const before = await readFamilyWorkbook()
    const childId = '33333333-3333-4333-8333-333333333333'
    const link = before.relationships.find(
      (row) => row.person_a === id && row.person_b === childId
    )!
    expect((await deleteRelationshipFromExcel(link.id)).ok).toBe(true)
    expect(
      (
        await addRelationshipToExcel({
          personId: id,
          selectedTargetId: childId,
          direction: 'child',
          relType: 'biological_child',
          note: ''
        })
      ).ok
    ).toBe(true)
    const spouse = await createSpouseInExcel({
      person: before.persons[0],
      name: 'Vợ mẫu',
      birthYear: ' 1985 ',
      note: ''
    })
    if (!spouse.ok) throw new Error(spouse.error)
    const children = await createChildrenInExcel({
      parentId: id,
      otherParentId: spouse.value,
      children: [
        {
          name: 'Con mẫu',
          id: 'test-child',
          isProcessing: false,
          gender: 'female',
          birthYear: '2020',
          birthOrder: '3'
        }
      ]
    })
    expect(children).toMatchObject({
      ok: true,
      value: { created: 1 }
    })
    const after = await readFamilyWorkbook()
    const child = after.persons.find((row) => row.full_name === 'Con mẫu')!
    expect(
      after.relationships.filter((row) => row.person_b === child.id)
    ).toHaveLength(2)
    expect(after.persons).toHaveLength(6)
    const parent = after.persons.find((person) => person.id === id)!
    const relevel = options(parent.full_name)
    relevel.fields.generation = 2
    expect(
      (
        await saveMemberToExcel({
          ...relevel,
          isEditing: true,
          initialData: parent,
          updateDescendantGenerations: true
        })
      ).ok
    ).toBe(true)
    expect(
      (await readFamilyWorkbook()).persons.find(
        (person) => person.id === child.id
      )?.generation
    ).toBe(3)
    const beforeFailedBatch = await readFile(process.env.FAMILY_DATA_FILE!)
    const failedBatch = await createChildrenInExcel({
      parentId: id,
      otherParentId: spouse.value,
      children: [
        {
          name: 'Valid first row',
          id: 'a',
          gender: 'male',
          birthYear: '2021',
          birthOrder: '4',
          isProcessing: false
        },
        {
          name: '',
          id: 'b',
          gender: 'female',
          birthYear: '2022',
          birthOrder: '5',
          isProcessing: false
        }
      ]
    })
    expect(failedBatch.ok).toBe(false)
    expect(
      (await readFile(process.env.FAMILY_DATA_FILE!)).equals(beforeFailedBatch)
    ).toBe(true)
    const marriedIn = before.persons.find((person) => person.is_in_law)!
    const bloodSpouse = await createSpouseInExcel({
      person: marriedIn,
      name: 'Người thuộc dòng họ',
      birthYear: '1980',
      note: ''
    })
    if (!bloodSpouse.ok) throw new Error(bloodSpouse.error)
    expect(
      (await readFamilyWorkbook()).persons.find(
        (person) => person.id === bloodSpouse.value
      )?.is_in_law
    ).toBe(false)
    await expect(deleteMemberProfile(child.id)).rejects.toThrow()
    expect(
      (await readFamilyWorkbook()).relationships.some(
        (row) => row.person_b === child.id
      )
    ).toBe(false)
  })

  test('persists events, avatar uploads and gallery records', async () => {
    admin = true
    expect(
      (
        await saveEventToExcel({
          name: 'Họp gia đình',
          event_date: '2026-12-01',
          location: null,
          content: null
        })
      ).ok
    ).toBe(true)
    const event = (await readFamilyWorkbook()).custom_events[0]
    expect(event.name).toBe('Họp gia đình')
    expect((await deleteEventFromExcel(event.id)).ok).toBe(true)
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==',
      'base64'
    )
    const avatar = await saveMemberToExcel({
      ...options('Có ảnh'),
      avatarFile: new File([png], 'avatar.png', { type: 'image/png' })
    })
    expect(avatar.ok).toBe(true)
    const uploaded = await uploadGalleryToLocal(
      new File([png], 'image.png', { type: 'image/png' })
    )
    if (!uploaded.ok) throw new Error(uploaded.error)
    expect(
      (
        await saveGalleryToExcel({
          fields: { title: 'Ảnh mẫu', description: null, event_date: null },
          imagePath: uploaded.value
        })
      ).ok
    ).toBe(true)
    const item = (await readFamilyWorkbook()).gallery[0]
    expect(item.title).toBe('Ảnh mẫu')
    expect((await readFile(join(testDirectory, item.image_url))).length).toBe(
      png.length
    )
    expect((await deleteGalleryFromExcel(item.id)).ok).toBe(true)
    expect((await readFamilyWorkbook()).gallery).toHaveLength(0)
  })
})
