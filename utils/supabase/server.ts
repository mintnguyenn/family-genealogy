import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { supabaseUrl as readSupabaseUrl, supabasePublishableKey } from './env'

const supabaseUrl = readSupabaseUrl()
const supabaseKey = supabasePublishableKey()

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>
) => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Cookie writes are unavailable during Server Component rendering.
        }
      }
    }
  })
}
