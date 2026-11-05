import { describe, expect, test } from 'bun:test'

import {
  GALLERY_PAGE_SIZE,
  getGalleryPageCount,
  parseGalleryPage
} from './gallery'

describe('parseGalleryPage', () => {
  test('reads positive integers and defaults to page 1', () => {
    expect(parseGalleryPage('3')).toBe(3)
    expect(parseGalleryPage(['2', '5'])).toBe(2)
    expect(parseGalleryPage(undefined)).toBe(1)
    expect(parseGalleryPage('0')).toBe(1)
    expect(parseGalleryPage('-2')).toBe(1)
    expect(parseGalleryPage('abc')).toBe(1)
    expect(parseGalleryPage('1.5')).toBe(1)
  })

  test('page count is at least 1', () => {
    expect(getGalleryPageCount(0)).toBe(1)
    expect(getGalleryPageCount(GALLERY_PAGE_SIZE)).toBe(1)
    expect(getGalleryPageCount(GALLERY_PAGE_SIZE + 1)).toBe(2)
  })
})
