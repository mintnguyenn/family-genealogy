import { cookies } from 'next/headers'
import { cache } from 'react'

import { getAdminSession } from '@/app/actions/auth'
import { createClient } from '@/utils/supabase/server'
import { createSessionQueries } from '@/utils/supabase/sessionQueries'

// Cached per request by React: one Supabase client and one person row per id.
export const { getSupabase, getPersonById } = createSessionQueries(
  cache,
  async () => createClient(await cookies())
)

export const getIsAdmin = cache(getAdminSession)
