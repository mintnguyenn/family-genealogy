'use server'

import { randomUUID } from 'node:crypto'

import type { BulkChildRow } from '@/components/relationship/relationshipTypes'
import { getIsAdmin } from '@/lib/auth'
import { performExcelWrite } from '@/lib/excelAction'
import {
  addFamilyRelationship,
  applyGenerations,
  createFamilyChildren,
  createFamilySpouse,
  savePerson
} from '@/lib/familyMutations'
import {
  removeNewImage,
  removeUnusedImage,
  saveLocalImage
} from '@/lib/localImages'
import type { GalleryItem } from '@/types'
import { isValidEventDate } from '@/utils/backupPayload'
import type { CustomEventPayload } from '@/utils/customEventMutations'
import type { GalleryItemFields } from '@/utils/gallery'
import type { GenerationUpdate } from '@/utils/generationUpdates'
import { checkTextLength, MAX_NAME, MAX_NOTE } from '@/utils/limits'
import type { SaveMemberOptions } from '@/utils/memberForm/types'
import type {
  NewRelationshipInput,
  SpouseInput
} from '@/utils/relationshipMutations'
import {
  GalleryItemNotUpdatedError,
  type WriteResult
} from '@/utils/writeErrors'

export async function saveMemberToExcel(options: SaveMemberOptions) {
  let uploaded: string | undefined
  let previousAvatar: string | null | undefined
  const result = await performExcelWrite(async (data, timestamp) => {
    previousAvatar = options.isEditing
      ? data.persons.find((person) => person.id === options.initialData?.id)
          ?.avatar_url
      : null
    if (options.avatarFile)
      uploaded = await saveLocalImage(options.avatarFile, 'avatars')
    return savePerson(
      data,
      { ...options, avatarUrl: uploaded ?? options.avatarUrl },
      timestamp
    )
  })
  if (!result.ok && uploaded)
    await removeNewImage(uploaded).catch((error) =>
      console.error('Could not clean up failed avatar upload:', error)
    )
  if (
    result.ok &&
    previousAvatar &&
    (uploaded || options.removeExistingAvatar)
  ) {
    await removeUnusedImage(previousAvatar).catch((error) =>
      console.error('Could not clean up old avatar:', error)
    )
  }
  return result
}

export async function addRelationshipToExcel(input: NewRelationshipInput) {
  return performExcelWrite((data, timestamp) =>
    addFamilyRelationship(data, input, timestamp)
  )
}

export async function deleteRelationshipFromExcel(id: string) {
  return performExcelWrite((data) => {
    if (!data.relationships.some((row) => row.id === id))
      throw new Error('Quan hệ không còn tồn tại.')
    data.relationships = data.relationships.filter((row) => row.id !== id)
  })
}

export async function createSpouseInExcel(input: SpouseInput) {
  return performExcelWrite((data, timestamp) =>
    createFamilySpouse(data, input, timestamp)
  )
}

export async function createChildrenInExcel(input: {
  children: BulkChildRow[]
  parentId: string
  otherParentId: string
}) {
  return performExcelWrite((data, timestamp) =>
    createFamilyChildren(data, input, timestamp)
  )
}

export async function applyGenerationsToExcel(updates: GenerationUpdate[]) {
  const result = await performExcelWrite((data) =>
    applyGenerations(data, updates)
  )
  return result.ok
    ? { ok: true as const, count: result.value }
    : { ok: false as const, error: result.error }
}

export async function saveEventToExcel(
  payload: CustomEventPayload,
  id?: string
) {
  return performExcelWrite((data) => {
    checkTextLength('eventName', payload.name, MAX_NAME)
    checkTextLength('details', payload.content, MAX_NOTE)
    checkTextLength('location', payload.location, MAX_NOTE)
    if (id && !data.custom_events.some((row) => row.id === id))
      throw new Error('Sự kiện không còn tồn tại.')
    const row = {
      id: id ?? randomUUID(),
      name: payload.name.trim(),
      content: payload.content,
      location: payload.location,
      event_date: payload.event_date,
      recurrence: payload.recurrence ?? 'none',
      created_by: null
    }
    data.custom_events = data.custom_events.filter(
      (event) => event.id !== row.id
    )
    data.custom_events.push(row)
  })
}

export async function deleteEventFromExcel(id: string) {
  return performExcelWrite((data) => {
    if (!data.custom_events.some((row) => row.id === id))
      throw new Error('Sự kiện không còn tồn tại.')
    data.custom_events = data.custom_events.filter((row) => row.id !== id)
  })
}

export async function saveGalleryToExcel(options: {
  initialData?: Pick<GalleryItem, 'id' | 'image_url'> | null
  fields: GalleryItemFields
  imagePath: string
  uploadedPath?: string | null
}) {
  let previousImage: string | undefined
  const result = await performExcelWrite((data, timestamp) => {
    if (!options.fields.title.trim()) throw new Error('Vui lòng nhập tên ảnh.')
    checkTextLength('eventName', options.fields.title, MAX_NAME)
    checkTextLength('details', options.fields.description, MAX_NOTE)
    if (
      !options.imagePath.startsWith('/') ||
      options.imagePath.startsWith('//') ||
      options.imagePath.includes('..') ||
      options.imagePath.includes('\\')
    )
      throw new Error('Đường dẫn ảnh không hợp lệ.')
    if (
      options.fields.event_date &&
      !isValidEventDate(options.fields.event_date)
    )
      throw new Error('Ngày sự kiện không hợp lệ.')
    const before =
      options.initialData &&
      data.gallery.find((row) => row.id === options.initialData!.id)
    if (options.initialData && !before) throw new GalleryItemNotUpdatedError()
    previousImage = before ? before.image_url : undefined
    const row = {
      id: before ? before.id : randomUUID(),
      title: options.fields.title.trim(),
      description: options.fields.description,
      event_date: options.fields.event_date,
      image_url: options.imagePath,
      created_at: before ? before.created_at : timestamp,
      created_by: null
    }
    data.gallery = data.gallery.filter((item) => item.id !== row.id)
    data.gallery.push(row)
  })
  if (await getIsAdmin()) {
    const unused = result.ok ? previousImage : options.uploadedPath
    await removeUnusedImage(unused).catch((error) =>
      console.error('Could not clean up gallery upload:', error)
    )
  }
  return result
}

export async function deleteGalleryFromExcel(id: string) {
  const result = await performExcelWrite((data) => {
    const item = data.gallery.find((row) => row.id === id)
    if (!item) throw new GalleryItemNotUpdatedError()
    data.gallery = data.gallery.filter((row) => row.id !== id)
    return item.image_url
  })
  if (!result.ok) return result
  const fileRemoved = await removeUnusedImage(result.value).catch(() => false)
  return { ok: true as const, value: { fileRemoved } }
}

export async function uploadGalleryToLocal(
  file: File
): Promise<WriteResult<string>> {
  if (!(await getIsAdmin()))
    return { ok: false, error: 'Bạn cần đăng nhập admin để tải ảnh.' }
  try {
    return { ok: true, value: await saveLocalImage(file, 'gallery') }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
