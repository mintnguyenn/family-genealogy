import { randomUUID } from 'node:crypto'
import {
  access,
  readFile,
  rename,
  stat,
  unlink,
  utimes,
  writeFile
} from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'

import ExcelJS from 'exceljs'
import { lock } from 'proper-lockfile'

import type { PrivateDetails } from '@/lib/data'
import { translate } from '@/lib/i18n/messages'
import type { GalleryItem, Person, Relationship } from '@/types'
import {
  isValidEventDate,
  sanitizeCustomEvent,
  sanitizePerson,
  validateImportPayload,
  type CustomEventExport,
  type PersonExport
} from '@/utils/backupPayload'
import type { CustomEventRecord } from '@/utils/eventHelpers'
import { isUuid } from '@/utils/uuid'

export interface FamilyData {
  persons: Person[]
  relationships: Relationship[]
  person_details_private: PrivateDetails[]
  custom_events: CustomEventRecord[]
  gallery: GalleryItem[]
}

export function familyWorkbookPath() {
  return process.env.FAMILY_DATA_FILE || 'data/Family_Genealogy.xlsx'
}

export async function decodeWorkbook(buffer: Uint8Array) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)
  return workbook
}

function cellValue(cell: ExcelJS.Cell) {
  const value = cell.value
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (value && typeof value === 'object')
    return 'result' in value ? (value.result ?? null) : cell.text
  return value
}

function validateFamily(input: unknown) {
  const error = validateImportPayload(
    input,
    (key, values) => translate('vi', key, values),
    true
  )
  if (error) throw new Error(`Excel: ${error}`)
}

const NUMBER_FIELDS = [
  'birth_year',
  'birth_month',
  'birth_day',
  'death_year',
  'death_month',
  'death_day',
  'death_lunar_year',
  'death_lunar_month',
  'death_lunar_day',
  'birth_order',
  'generation'
]

function sheetRows(
  workbook: ExcelJS.Workbook,
  name: string,
  required: string[],
  optional = false
): Record<string, unknown>[] {
  const sheet = workbook.getWorksheet(name)
  if (!sheet) {
    if (optional) return []
    throw new Error(`Excel: missing sheet "${name}".`)
  }
  const columns = (sheet.getRow(1).values as ExcelJS.CellValue[])
    .slice(1)
    .map((_, index) => sheet.getCell(1, index + 1).text.trim())
  const namedColumns = columns.filter(Boolean)
  if (new Set(namedColumns).size !== namedColumns.length)
    throw new Error(`Excel: duplicate column in sheet "${name}".`)
  for (const field of required) {
    if (!columns.includes(field))
      throw new Error(`Excel: missing column "${name}.${field}".`)
  }
  const records: Record<string, unknown>[] = []
  sheet.eachRow((row, index) => {
    if (index === 1) return
    const record = Object.fromEntries(
      columns.flatMap((column, columnIndex) =>
        column ? [[column, cellValue(row.getCell(columnIndex + 1))]] : []
      )
    )
    if (Object.values(record).some((value) => value !== null && value !== ''))
      records.push(record)
  })
  return records
}

/** Keep the old domain shape and reuse its date/ID/relationship validation. */
export function parseFamilyWorkbook(
  workbook: ExcelJS.Workbook,
  timestamp: string
): FamilyData {
  const persons = sheetRows(workbook, 'persons', ['id', 'full_name', 'gender'])
  for (const [index, person] of persons.entries()) {
    for (const field of NUMBER_FIELDS) {
      if (typeof person[field] === 'string') {
        person[field] = person[field].trim() ? Number(person[field]) : null
      }
    }
    for (const field of ['is_deceased', 'is_in_law']) {
      const value = person[field]
      if (value === null || value === undefined || value === '') {
        person[field] = false
      } else if (typeof value === 'string' && /^(true|false)$/i.test(value)) {
        person[field] = value.toLowerCase() === 'true'
      } else if (typeof value !== 'boolean') {
        throw new Error(
          `Excel: persons row ${index + 2}, ${field} must be TRUE or FALSE.`
        )
      }
    }
  }
  const relationships = sheetRows(workbook, 'relationships', [
    'id',
    'type',
    'person_a',
    'person_b'
  ])
  const relationshipIds = new Set<string>()
  for (const row of relationships) {
    if (
      typeof row.id !== 'string' ||
      !isUuid(row.id) ||
      relationshipIds.has(row.id)
    )
      throw new Error('Excel: relationship IDs must be unique UUIDs.')
    relationshipIds.add(row.id)
  }
  const details = sheetRows(
    workbook,
    'person_details_private',
    ['person_id'],
    true
  )
  const events = sheetRows(
    workbook,
    'custom_events',
    ['id', 'name', 'event_date'],
    true
  )
  const gallery = sheetRows(
    workbook,
    'gallery',
    ['id', 'title', 'image_url'],
    true
  )
  const galleryIds = new Set<string>()
  for (const row of gallery) {
    if (
      typeof row.id !== 'string' ||
      !isUuid(row.id) ||
      galleryIds.has(row.id) ||
      typeof row.title !== 'string' ||
      !row.title.trim() ||
      typeof row.image_url !== 'string' ||
      !row.image_url.trim() ||
      (row.description != null && typeof row.description !== 'string') ||
      (row.event_date != null && !isValidEventDate(row.event_date))
    )
      throw new Error('Excel: invalid gallery ID, title, image or date.')
    galleryIds.add(row.id)
  }
  validateFamily({
    persons,
    relationships,
    person_details_private: details,
    custom_events: events
  })
  return {
    persons: persons.map((row) => ({
      ...sanitizePerson(row as unknown as PersonExport),
      created_at:
        typeof row.created_at === 'string' ? row.created_at : timestamp,
      updated_at: timestamp
    })) as Person[],
    relationships: relationships.map((row) => ({
      id: row.id,
      type: row.type,
      person_a: row.person_a,
      person_b: row.person_b,
      note: row.note ?? null,
      created_at:
        typeof row.created_at === 'string' ? row.created_at : timestamp,
      updated_at: timestamp
    })) as Relationship[],
    person_details_private: details.map((row) => ({
      person_id: row.person_id as string,
      phone_number: (row.phone_number as string | null) ?? null,
      occupation: (row.occupation as string | null) ?? null,
      current_residence: (row.current_residence as string | null) ?? null
    })),
    custom_events: events.map((row) => ({
      ...sanitizeCustomEvent(row as unknown as CustomEventExport),
      created_by: typeof row.created_by === 'string' ? row.created_by : null
    })),
    gallery: gallery.map((row) => ({
      id: row.id,
      title: row.title,
      image_url: row.image_url,
      description: row.description ?? null,
      event_date: row.event_date ?? null,
      created_by: typeof row.created_by === 'string' ? row.created_by : null,
      created_at:
        typeof row.created_at === 'string' ? row.created_at : timestamp
    })) as unknown as GalleryItem[]
  }
}

/** Server-side only: the workbook is outside public/ and is never downloaded. */
export async function readFamilyWorkbook(filePath = familyWorkbookPath()) {
  if (extname(filePath).toLowerCase() !== '.xlsx')
    throw new Error('Family data must be an .xlsx file.')
  const [buffer, metadata] = await Promise.all([
    // Runtime configuration: personal workbooks stay outside the build.
    readFile(/* turbopackIgnore: true */ filePath),
    stat(/* turbopackIgnore: true */ filePath)
  ])
  return parseFamilyWorkbook(
    await decodeWorkbook(buffer),
    metadata.mtime.toISOString()
  )
}

function syncSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  records: object[],
  key = 'id'
) {
  let sheet = workbook.getWorksheet(name)
  if (!sheet && !records.length) return
  sheet ??= workbook.addWorksheet(name)
  const headers = Array.from({ length: sheet.columnCount }, (_, i) =>
    sheet!.getCell(1, i + 1).text.trim()
  )
  const rows = records as Record<string, ExcelJS.CellValue>[]
  for (const record of rows) {
    for (const [field, value] of Object.entries(record)) {
      if (!headers.includes(field) && value !== null && value !== undefined) {
        headers.push(field)
        sheet.getCell(1, headers.length).value = field
        sheet.getColumn(headers.length).width = field.endsWith('_at')
          ? 28
          : Math.max(16, field.length + 2)
        if (headers.length > 1)
          sheet.getCell(1, headers.length).style = {
            ...sheet.getCell(1, 1).style
          }
      }
    }
  }
  const idColumn = headers.indexOf(key) + 1
  const positions = new Map<string, number>()
  for (let i = 2; i <= sheet.rowCount; i++) {
    const id = String(cellValue(sheet.getCell(i, idColumn)) ?? '')
    if (id) positions.set(id, i)
  }
  const retained = new Set(rows.map((row) => String(row[key])))
  for (const [id, position] of positions)
    if (!retained.has(id)) sheet.getRow(position).values = []
  for (const record of rows) {
    const position = positions.get(String(record[key])) ?? sheet.rowCount + 1
    for (const [field, value] of Object.entries(record)) {
      const column = headers.indexOf(field) + 1
      if (column > 0) sheet.getCell(position, column).value = value ?? null
    }
  }
}

async function checkExcelClosed(filePath: string) {
  try {
    await access(
      /* turbopackIgnore: true */ join(
        dirname(filePath),
        '~$' + basename(filePath)
      )
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
  throw new Error(
    'Hãy đóng file đang mở trong Microsoft Excel rồi lưu lại trên web.'
  )
}

/** All web writes share a cross-process lock and replace the file atomically. */
export async function updateFamilyWorkbook<T>(
  change: (data: FamilyData, timestamp: string) => T | Promise<T>,
  configuredPath = familyWorkbookPath()
): Promise<T> {
  const filePath = resolve(/* turbopackIgnore: true */ configuredPath)
  await checkExcelClosed(filePath)
  let compromised: Error | undefined
  const release = await lock(filePath, {
    retries: { retries: 8, minTimeout: 50, maxTimeout: 250 },
    onCompromised: (error) => {
      compromised = error
    }
  }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ELOCKED')
      throw new Error(
        'Dữ liệu đang được lưu ở phiên khác. Hãy thử lại sau ít giây.'
      )
    throw error
  })
  const temporary = filePath + '.' + randomUUID() + '.tmp'
  try {
    const original = await readFile(/* turbopackIgnore: true */ filePath)
    const metadata = await stat(/* turbopackIgnore: true */ filePath)
    const workbook = await decodeWorkbook(original)
    const data = parseFamilyWorkbook(workbook, metadata.mtime.toISOString())
    const timestamp = new Date(
      Math.max(Date.now(), metadata.mtimeMs + 1)
    ).toISOString()
    const result = await change(data, timestamp)
    for (const person of data.persons) person.updated_at = timestamp
    // Reuse the backup validator before replacing anything on disk.
    validateFamily(data)
    syncSheet(workbook, 'persons', data.persons)
    syncSheet(workbook, 'relationships', data.relationships)
    syncSheet(
      workbook,
      'person_details_private',
      data.person_details_private,
      'person_id'
    )
    syncSheet(workbook, 'custom_events', data.custom_events)
    syncSheet(workbook, 'gallery', data.gallery)
    const output = await workbook.xlsx.writeBuffer()
    await writeFile(
      /* turbopackIgnore: true */ temporary,
      Buffer.from(output),
      { flag: 'wx' }
    )
    await utimes(
      /* turbopackIgnore: true */ temporary,
      new Date(timestamp),
      new Date(timestamp)
    )
    await checkExcelClosed(filePath)
    if (compromised) throw compromised
    const latest = await readFile(/* turbopackIgnore: true */ filePath)
    if (!latest.equals(original))
      throw new Error(
        'File Excel vừa được sửa ở nơi khác. Hãy tải lại trang rồi thử lại.'
      )
    await writeFile(/* turbopackIgnore: true */ filePath + '.bak', original)
    await rename(/* turbopackIgnore: true */ temporary, filePath)
    return result
  } catch (error) {
    if (
      ['EPERM', 'EACCES', 'EBUSY'].includes(
        (error as NodeJS.ErrnoException).code ?? ''
      )
    )
      throw new Error(
        'Không thể thay thế file Excel. Hãy đóng Excel và kiểm tra quyền Modify của thư mục dữ liệu.'
      )
    throw error
  } finally {
    await unlink(/* turbopackIgnore: true */ temporary).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT')
          console.error('Could not remove temporary workbook:', error)
      }
    )
    await release().catch((error) =>
      console.error('Could not release workbook lock:', error)
    )
  }
}
