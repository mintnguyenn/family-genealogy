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
export async function loadGalleryPage(requestedPage: number) {
  const items = [...(await getGalleryItems())].sort(
    (a, b) =>
      (b.event_date ?? '').localeCompare(a.event_date ?? '') ||
      b.created_at.localeCompare(a.created_at) ||
      a.id.localeCompare(b.id)
  )
  const pageCount = getGalleryPageCount(items.length)
  const page = Math.min(pageCount, Math.max(1, requestedPage))
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
}): Promise<void> {
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
