import { describe, expect, test } from 'bun:test'

import { getAvatarUrl } from './avatar'

describe('local avatar paths', () => {
  test('uses local paths without a signing service or proxy', () => {
    expect(getAvatarUrl('family/person.png')).toBe(
      '/uploads/avatars/family/person.png'
    )
    expect(getAvatarUrl('/images/person.png')).toBe('/images/person.png')
  })

  test('missing paths have no image', () => {
    for (const value of [null, undefined, '', '   '])
      expect(getAvatarUrl(value)).toBeNull()
  })

  test('rejects remote origins, protocols and path traversal', () => {
    for (const value of [
      'https://example.com/photo.jpg',
      '//example.com/photo.jpg',
      'javascript:alert(1)',
      '../photo.jpg',
      'family/../photo.jpg',
      'family\\photo.jpg'
    ]) {
      expect(getAvatarUrl(value)).toBeNull()
    }
  })
})
