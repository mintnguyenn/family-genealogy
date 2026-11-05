'use client'

import { SupabaseClient } from '@supabase/supabase-js'
import { createContext, ReactNode, useContext, useMemo } from 'react'

import { createClient } from '@/utils/supabase/client'

interface UserState {
  isAdmin: boolean
  canEdit: boolean
  supabase: SupabaseClient
}

const UserContext = createContext<UserState | undefined>(undefined)

export function UserProvider({
  children,
  isAdmin
}: {
  children: ReactNode
  isAdmin: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const value = useMemo(
    () => ({ isAdmin, canEdit: isAdmin, supabase }),
    [isAdmin, supabase]
  )
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
