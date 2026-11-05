import { isUuid } from '@/utils/uuid'

/** Reads `?member=`: a member id, or null for "all photos". */
export function parseGalleryMember(
  value: string | string[] | undefined
): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  return raw && isUuid(raw) ? raw : null
}

/** Reads `?photo=`: the photo to open in the lightbox, or null. */
export function parseGalleryPhoto(
  value: string | string[] | undefined
): string | null {
  return parseGalleryMember(value)
}

/** Gallery URL for a page, member filter and (optionally) an open photo. */
export function galleryHref({
  page = 1,
  member,
  photo
}: {
  page?: number
  member?: string | null
  photo?: string | null
}) {
  const params = new URLSearchParams()
  if (member) params.set('member', member)
  if (page > 1) params.set('page', String(page))
  if (photo) params.set('photo', photo)
  const query = params.toString()
  return query ? `/dashboard/gallery?${query}` : '/dashboard/gallery'
}

/** True when both lists hold the same ids (order and repeats ignored). */
export function sameIds(a: readonly string[], b: readonly string[]) {
  const left = new Set(a)
  const right = new Set(b)
  return left.size === right.size && [...left].every((id) => right.has(id))
}
