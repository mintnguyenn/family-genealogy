import { describe, expect, test } from 'bun:test'

import { galleryHref, parseGalleryMember, sameIds } from './galleryTags'

const ITEM = '44444444-4444-4444-8444-444444444444'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

describe('gallery URLs', () => {
  test('reads a member id only when it is a UUID', () => {
    expect(parseGalleryMember(A)).toBe(A)
    expect(parseGalleryMember([A, B])).toBe(A)
    expect(parseGalleryMember('x')).toBeNull()
    expect(parseGalleryMember(undefined)).toBeNull()
  })

  test('builds the link with the filter, page and photo', () => {
    expect(galleryHref({})).toBe('/dashboard/gallery')
    expect(galleryHref({ page: 1 })).toBe('/dashboard/gallery')
    expect(galleryHref({ member: A, page: 3 })).toBe(
      `/dashboard/gallery?member=${A}&page=3`
    )
    expect(galleryHref({ member: A, photo: ITEM })).toBe(
      `/dashboard/gallery?member=${A}&photo=${ITEM}`
    )
  })

  test('compares id lists as sets', () => {
    expect(sameIds([A, B], [B, A])).toBe(true)
    expect(sameIds([A], [A, B])).toBe(false)
    expect(sameIds([], [])).toBe(true)
  })
})
