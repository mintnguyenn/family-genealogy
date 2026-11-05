import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Preserve any SDK cookie updates when the schema check redirects.
function redirectWithCookies(url: URL, supabaseResponse: NextResponse) {
  const response = NextResponse.redirect(url)
  supabaseResponse.cookies
    .getAll()
    .forEach((cookie) => response.cookies.set(cookie))
  return response
}

// Set once the persons table has answered without error. The schema does not
// disappear while the server runs, so later requests skip the probe instead of
// paying an extra Supabase query each. Until then (fresh install, /setup not
// run yet) every dashboard request still checks and redirects.
let schemaReady = false

// For tests: forget a previous successful probe.
export function resetSchemaCheck() {
  schemaReady = false
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  // If env vars are missing, we cannot create a supabase client
  if (!supabaseUrl || !supabaseKey) {
    if (request.nextUrl.pathname !== '/missing-db-config') {
      const url = request.nextUrl.clone()
      url.pathname = '/missing-db-config'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request
  })

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({
          request
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      }
    }
  })

  // Check if DB schema is initialized by checking if persons table exists
  if (request.nextUrl.pathname.startsWith('/dashboard') && !schemaReady) {
    const { error: schemaError } = await supabase
      .from('persons')
      .select('id')
      .limit(1)

    if (
      schemaError &&
      (schemaError.code === 'PGRST205' || schemaError.code === '42P01')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/setup'
      return redirectWithCookies(url, supabaseResponse)
    }

    if (!schemaError) schemaReady = true
  }

  return supabaseResponse
}
