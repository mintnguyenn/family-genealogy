import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { NextRequest, type NextResponse } from 'next/server'

type CookieToSet = {
  name: string
  value: string
  options?: Record<string, unknown>
}
type CookieMethods = { setAll: (cookies: CookieToSet[]) => void }

let schemaErrorCode: string | null = null
let refreshedCookies: CookieToSet[] = []
let schemaProbes = 0

mock.module('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    { cookies }: { cookies: CookieMethods }
  ) => ({
    from: (table: string) => {
      if (table === 'persons') schemaProbes++
      return {
        select: () => ({
          limit: async () => {
            // The SDK may update cookies while making the schema query.
            if (refreshedCookies.length) cookies.setAll(refreshedCookies)
            return { error: schemaErrorCode ? { code: schemaErrorCode } : null }
          }
        })
      }
    }
  })
}))

const { resetSchemaCheck, updateSession } = await import('./middleware')

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

const request = (path: string) =>
  new NextRequest(new URL(path, 'http://localhost:3000'))

const SESSION_COOKIES: CookieToSet[] = [
  {
    name: 'sb-test-auth-token',
    value: 'new-session',
    options: { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 3600 }
  },
  {
    name: 'sb-test-auth-token.1',
    value: 'second-chunk',
    options: { path: '/' }
  }
]

function expectSessionCookies(res: NextResponse) {
  const first = res.cookies.get('sb-test-auth-token')
  expect(first?.value).toBe('new-session')
  expect(first?.httpOnly).toBe(true)
  expect(first?.maxAge).toBe(3600)
  expect(res.cookies.get('sb-test-auth-token.1')?.value).toBe('second-chunk')
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'dummy'

  schemaErrorCode = null
  refreshedCookies = []
  schemaProbes = 0
  resetSchemaCheck()
})

afterAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = originalKey
})

describe('updateSession', () => {
  test('redirects to /missing-db-config when env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    const response = await updateSession(request('/dashboard'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/missing-db-config'
    )
  })

  test('lets /missing-db-config through when env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    const response = await updateSession(request('/missing-db-config'))
    expect(response.headers.get('location')).toBeNull()
  })

  for (const code of ['PGRST205', '42P01']) {
    test(`redirects to /setup when persons table is missing (${code})`, async () => {
      schemaErrorCode = code
      refreshedCookies = SESSION_COOKIES
      const response = await updateSession(request('/dashboard/members'))
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/setup'
      )
      expectSessionCookies(response)
    })
  }

  test.each([
    '/dashboard',
    '/dashboard/members/abc-123?tab=x',
    '/dashboard/events?view=list'
  ])('lets a guest browse %s without a login redirect', async (path) => {
    const req = request(path)
    const originalUrl = req.url
    const response = await updateSession(req)
    expect(response.headers.get('location')).toBeNull()
    expect(req.url).toBe(originalUrl)
  })

  test('keeps refreshed cookies when no redirect is needed', async () => {
    refreshedCookies = SESSION_COOKIES
    const response = await updateSession(request('/dashboard'))
    expect(response.headers.get('location')).toBeNull()
    expectSessionCookies(response)
  })

  test('other schema errors do not redirect to /setup', async () => {
    schemaErrorCode = '42501'
    const response = await updateSession(request('/dashboard'))
    expect(response.headers.get('location')).toBeNull()
  })

  test('probes the schema once, then skips it on later requests', async () => {
    await updateSession(request('/dashboard'))
    expect(schemaProbes).toBe(1)

    const second = await updateSession(request('/dashboard/members'))
    expect(second.headers.get('location')).toBeNull()
    await updateSession(request('/dashboard/events'))
    expect(schemaProbes).toBe(1)
  })

  test('keeps probing and redirecting to /setup until the schema exists', async () => {
    schemaErrorCode = '42P01'
    for (const path of ['/dashboard', '/dashboard/members']) {
      const response = await updateSession(request(path))
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/setup'
      )
    }
    expect(schemaProbes).toBe(2)

    // After /setup created the tables the next request finds them.
    schemaErrorCode = null

    const ready = await updateSession(request('/dashboard'))
    expect(ready.headers.get('location')).toBeNull()
    expect(schemaProbes).toBe(3)
  })

  test('an unrelated schema error does not mark the schema as checked', async () => {
    schemaErrorCode = '42501'
    await updateSession(request('/dashboard'))
    await updateSession(request('/dashboard'))
    expect(schemaProbes).toBe(2)
  })

  test('public pages never probe the schema', async () => {
    await updateSession(request('/'))
    await updateSession(request('/missing-db-config'))
    expect(schemaProbes).toBe(0)
  })
})
