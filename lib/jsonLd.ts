import config from '@/app/config'
import type { Locale } from '@/lib/i18n/messages'

export type JsonLd = Record<string, unknown>

/**
 * schema.org WebSite of the public home page. Only site-level data, never
 * anything about the members of a family tree.
 */
export function websiteJsonLd({
  description,
  locale
}: {
  description: string
  locale: Locale
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.siteName,
    url: config.siteUrl,
    description,
    inLanguage: locale
  }
}

const UNSAFE_CHARS = new Set([
  '<',
  String.fromCharCode(0x2028),
  String.fromCharCode(0x2029)
])

/**
 * JSON for an inline `<script type="application/ld+json">`. `<` (and the
 * line separators JS treats as newlines) are escaped so a value such as a
 * site name containing `</script>` cannot end the script element.
 */
export function serializeJsonLd(data: JsonLd): string {
  return Array.from(JSON.stringify(data), (char) =>
    UNSAFE_CHARS.has(char)
      ? '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')
      : char
  ).join('')
}
