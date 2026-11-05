import { createBrowserClient } from '@supabase/ssr'

import { supabaseUrl as readSupabaseUrl, supabasePublishableKey } from './env'

const supabaseUrl = readSupabaseUrl()
const supabaseKey = supabasePublishableKey()

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }
  return createBrowserClient(supabaseUrl, supabaseKey)
}
