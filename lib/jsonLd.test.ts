import { describe, expect, test } from 'bun:test'

import { serializeJsonLd, websiteJsonLd } from './jsonLd'

describe('websiteJsonLd', () => {
  test('describes the site only', () => {
    const data = websiteJsonLd({ description: 'Desc', locale: 'vi' })
    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toBe('WebSite')
    expect(data.description).toBe('Desc')
    expect(data.inLanguage).toBe('vi')
    expect(String(data.url)).toMatch(/^https?:\/\//)
  })
})

describe('serializeJsonLd', () => {
  test('escapes < so a value cannot close the script element', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('<')
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>')
  })

  test('escapes line separators and round-trips', () => {
    const out = serializeJsonLd({ a: 'x\u2028y\u2029z' })
    expect(out).not.toContain('\u2028')
    expect(out).not.toContain('\u2029')
    expect(JSON.parse(out).a).toBe('x\u2028y\u2029z')
  })
})
