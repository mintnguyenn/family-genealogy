import {
  deleteGalleryFromExcel,
  saveGalleryToExcel,
  uploadGalleryToLocal
} from '@/app/actions/excel'
import { getGalleryItems } from '@/lib/data'
import type { GalleryItem } from '@/types'
import { validateImageFile } from '@/utils/imageUpload'
import { unwrapWriteResult } from '@/utils/writeErrors'

export const GALLERY_PAGE_SIZE = 24
export function parseGalleryPage(value: string | string[] | undefined) {
  const text = Array.isArray(value) ? value[0] : value
  if (!text || !/^\d+$/.test(text)) return 1
  const page = Number(text)
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}
export function getGalleryPageCount(total: number) {
  return Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE))
}
export async function loadGalleryPage(
  requestedPage: number,
  personId?: string | null
) {
  const items = (await getGalleryItems())
    .filter((item) => !personId || item.person_ids?.includes(personId))
    .sort(
      (a, b) =>
        (b.event_date ?? '').localeCompare(a.event_date ?? '') ||
        b.created_at.localeCompare(a.created_at) ||
        a.id.localeCompare(b.id)
    )
  const pageCount = getGalleryPageCount(items.length)
  const page = Math.min(pageCount, Math.max(1, Math.floor(requestedPage) || 1))
  return {
    items: items.slice(
      (page - 1) * GALLERY_PAGE_SIZE,
      page * GALLERY_PAGE_SIZE
    ),
    page,
    pageCount,
    total: items.length
  }
}
export interface GalleryItemFields {
  title: string
  description: string | null
  event_date: string | null
}
export async function saveGalleryItem(options: {
  initialData?: Pick<GalleryItem, 'id' | 'image_url'> | null
  fields: GalleryItemFields
  imagePath: string
  uploadedPath?: string | null
  personIds?: string[]
}): Promise<string> {
  return unwrapWriteResult(await saveGalleryToExcel(options))
}
export async function deleteGalleryItem(
  item: Pick<GalleryItem, 'id' | 'image_url'>
): Promise<{ fileRemoved: boolean }> {
  return unwrapWriteResult(await deleteGalleryFromExcel(item.id))
}
export class InvalidImageError extends Error {
  constructor(readonly reason: 'too-large' | 'unsupported-type') {
    super('Invalid image: ' + reason)
    this.name = 'InvalidImageError'
  }
}
export async function uploadGalleryImage(
  file: File
): Promise<{ path: string | null; error: Error | null }> {
  try {
    const validation = await validateImageFile(file)
    if (!validation.ok) throw new InvalidImageError(validation.reason)
    return {
      path: unwrapWriteResult(await uploadGalleryToLocal(file)),
      error: null
    }
  } catch (error) {
    return {
      path: null,
      error: error instanceof Error ? error : new Error(String(error))
    }
  }
}
export function getGalleryStoragePath(value: string | null | undefined) {
  return value?.trim() || null
}

/** Photos shown in the strip on a member's page. */
export const MEMBER_PHOTOS_SHOWN = 12

export async function loadMemberPhotos(
  personId: string
): Promise<{ items: GalleryItem[]; total: number }> {
  try {
    const { items, total } = await loadGalleryPage(1, personId)
    return {
      items: items
        .filter((item) => item.image_url)
        .slice(0, MEMBER_PHOTOS_SHOWN),
      total
    }
  } catch (err) {
    console.error('Cannot load member photos:', err)
    return { items: [], total: 0 }
  }
}
