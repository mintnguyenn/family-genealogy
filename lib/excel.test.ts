import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { describe, expect, test } from 'bun:test'
import ExcelJS from 'exceljs'

import { translate } from '@/lib/i18n/messages'
import { validateImportPayload } from '@/utils/backupPayload'
import { buildRelationshipData } from '@/utils/relationshipFetch'

import {
  decodeWorkbook,
  parseFamilyWorkbook,
  readFamilyWorkbook,
  updateFamilyWorkbook
} from './excel'

// Independent of the user's editable workbook.
const father = '11111111-1111-4111-8111-111111111111'
const mother = '22222222-2222-4222-8222-222222222222'
const children = [
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444'
]
const fixture = new ExcelJS.Workbook()
fixture.addWorksheet('persons').addRows([
  ['id', 'full_name', 'gender', 'birth_year', 'is_in_law'],
  [father, 'Ba mẫu', 'male', 1980, false],
  [mother, 'Mẹ mẫu', 'female', 1982, true],
  [children[0], 'Con trai mẫu', 'male', 2010, false],
  [children[1], 'Con gái mẫu', 'female', 2014, false]
])
fixture
  .addWorksheet('relationships')
  .addRows([
    ['id', 'type', 'person_a', 'person_b'],
    ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'marriage', father, mother],
    ...children.flatMap((child, i) =>
      [father, mother].map((parent, j) => [
        `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${2 + i * 2 + j}`,
        'biological_child',
        parent,
        child
      ])
    )
  ])
const sample = Buffer.from(await fixture.xlsx.writeBuffer())
const parse = (workbook: ExcelJS.Workbook) =>
  parseFamilyWorkbook(workbook, '2026-11-05T00:00:00.000Z')

async function withWorkbook(run: (file: string) => Promise<void>) {
  const root = resolve(tmpdir())
  const directory = await mkdtemp(join(root, 'family-excel-test-'))
  try {
    const file = join(directory, 'family.xlsx')
    await writeFile(file, sample)
    await run(file)
  } finally {
    if (dirname(directory) !== root)
      throw new Error('Unexpected test cleanup path')
    await rm(directory, { recursive: true, force: true })
  }
}

describe('Excel data adapter', () => {
  test('loads a family from disk with both parents linked to each child', async () => {
    await withWorkbook(async (file) => {
      const { persons, relationships } = await readFamilyWorkbook(file)
      expect(persons).toHaveLength(4)
      expect(relationships).toHaveLength(5)
      const t = (key: Parameters<typeof translate>[1]) => translate('en', key)
      for (const child of children) {
        expect(
          buildRelationshipData(persons, relationships, child, t)
            .relationships.filter((link) => link.direction === 'parent')
            .map((link) => link.targetPerson.id)
            .sort()
        ).toEqual([father, mother])
      }
    })
  })

  test('normalizes Excel cells, fills optional fields and excludes private columns', async () => {
    const workbook = await decodeWorkbook(sample)
    const sheet = workbook.getWorksheet('persons')!
    sheet.getCell('D2').value = '1980'
    sheet.getCell('E2').value = 'FALSE'
    sheet.getCell('E3').value = 'true'
    sheet.getCell('F1').value = 'phone_number'
    sheet.getCell('F2').value = '0900000000'
    sheet.addRow(['', '', '', '', ''])
    const { persons } = parse(workbook)
    expect(persons).toHaveLength(4)
    expect(persons[0]).toMatchObject({
      birth_year: 1980,
      is_in_law: false,
      death_year: null,
      avatar_url: null
    })
    expect(persons[1].is_in_law).toBe(true)
    expect(persons[0]).not.toHaveProperty('phone_number')
    sheet.getCell('E2').value = 'yes'
    expect(() => parse(workbook)).toThrow('must be TRUE or FALSE')
  })

  test('requires sheets and unambiguous column names', async () => {
    const workbook = await decodeWorkbook(sample)
    workbook.getWorksheet('persons')!.getCell('B1').value = 'name'
    expect(() => parse(workbook)).toThrow('missing column "persons.full_name"')
    workbook.getWorksheet('persons')!.getCell('B1').value = 'id'
    expect(() => parse(workbook)).toThrow('duplicate column')
    workbook.getWorksheet('persons')!.getCell('B1').value = 'full_name'
    workbook.removeWorksheet(workbook.getWorksheet('relationships')!.id)
    expect(() => parse(workbook)).toThrow('missing sheet "relationships"')
  })

  test('accepts an empty family with events, while imports still require people', async () => {
    const workbook = await decodeWorkbook(sample)
    for (const sheet of workbook.worksheets)
      sheet.eachRow((row, index) => {
        if (index > 1) row.values = []
      })
    workbook.addWorksheet('custom_events').addRows([
      ['id', 'name', 'event_date'],
      ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Họp gia đình', '2026-12-01']
    ])
    const data = parse(workbook)
    expect(data.persons).toEqual([])
    expect(data.custom_events).toHaveLength(1)
    expect(
      validateImportPayload({ persons: [], relationships: [] }, (key) => key)
    ).toBe('emptyBackup')
    workbook
      .getWorksheet('relationships')!
      .addRow([
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        'marriage',
        father,
        mother
      ])
    expect(() => parse(workbook)).toThrow(/quan hệ/i)
  })

  test('rereads edits without rewriting the workbook and reports missing files', async () => {
    await withWorkbook(async (file) => {
      await readFamilyWorkbook(file)
      expect((await readFile(file)).equals(sample)).toBe(true)
      const workbook = await decodeWorkbook(sample)
      workbook.getWorksheet('persons')!.getCell('B2').value = 'Tên mới'
      const edited = Buffer.from(await workbook.xlsx.writeBuffer())
      await writeFile(file, edited)
      expect((await readFamilyWorkbook(file)).persons[0].full_name).toBe(
        'Tên mới'
      )
      expect((await readFile(file)).equals(edited)).toBe(true)
      await expect(
        readFamilyWorkbook(join(dirname(file), 'missing.xlsx'))
      ).rejects.toThrow('ENOENT')
      await expect(readFamilyWorkbook(file + '.xls')).rejects.toThrow('.xlsx')
    })
  })

  test('preserves custom sheets, columns, styles and a backup when writing', async () => {
    await withWorkbook(async (file) => {
      const workbook = await decodeWorkbook(sample)
      workbook.addWorksheet('Notes').getCell('A1').value = 'Keep this sheet'
      const sheet = workbook.getWorksheet('persons')!
      sheet.getCell('F1').value = 'custom_column'
      sheet.getCell('F2').value = 'Keep this column'
      sheet.getCell('A1').font = { bold: true }
      await writeFile(file, Buffer.from(await workbook.xlsx.writeBuffer()))
      const original = await readFile(file)
      await updateFamilyWorkbook((data) => {
        data.persons[0].full_name = 'Đã lưu'
      }, file)
      expect((await readFamilyWorkbook(file)).persons[0].full_name).toBe(
        'Đã lưu'
      )
      expect((await readFile(file + '.bak')).equals(original)).toBe(true)
      const saved = await decodeWorkbook(await readFile(file))
      expect(saved.getWorksheet('Notes')!.getCell('A1').value).toBe(
        'Keep this sheet'
      )
      expect(saved.getWorksheet('persons')!.getCell('F2').value).toBe(
        'Keep this column'
      )
      expect(saved.getWorksheet('persons')!.getCell('A1').font.bold).toBe(true)
    })
  })

  test('serializes simultaneous writers without losing changes', async () => {
    await withWorkbook(async (file) => {
      await Promise.all(
        ['A', 'B', 'C', 'D'].map((letter) =>
          updateFamilyWorkbook(async (data) => {
            await new Promise((resolve) => setTimeout(resolve, 20))
            data.persons[0].other_names =
              (data.persons[0].other_names ?? '') + letter
          }, file)
        )
      )
      expect(
        (await readFamilyWorkbook(file)).persons[0].other_names
          ?.split('')
          .sort()
          .join('')
      ).toBe('ABCD')
    })
  })

  test('keeps external edits made while preparing a web save', async () => {
    await withWorkbook(async (file) => {
      await expect(
        updateFamilyWorkbook(async (data) => {
          const external = await decodeWorkbook(await readFile(file))
          external.getWorksheet('persons')!.getCell('B2').value =
            'Sửa trong Excel'
          await writeFile(file, Buffer.from(await external.xlsx.writeBuffer()))
          data.persons[0].full_name = 'Stale web edit'
        }, file)
      ).rejects.toThrow('vừa được sửa')
      expect((await readFamilyWorkbook(file)).persons[0].full_name).toBe(
        'Sửa trong Excel'
      )
    })
  })

  test('refuses open-in-Excel and invalid writes without changing the file', async () => {
    await withWorkbook(async (file) => {
      const marker = join(dirname(file), '~$family.xlsx')
      await writeFile(marker, 'Office owner marker')
      await expect(
        updateFamilyWorkbook((data) => {
          data.persons[0].full_name = 'Blocked'
        }, file)
      ).rejects.toThrow('đóng file')
      await rm(marker)
      await expect(
        updateFamilyWorkbook((data) => {
          data.persons[0].full_name = ''
        }, file)
      ).rejects.toThrow()
      expect((await readFile(file)).equals(sample)).toBe(true)
    })
  })
})
