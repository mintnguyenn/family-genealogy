'use client'

import { createContext, ReactNode, useContext, useMemo } from 'react'

interface UserState {
  isAdmin: boolean
  canEdit: boolean
}

const UserContext = createContext<UserState | undefined>(undefined)

export function UserProvider({
  children,
  isAdmin
}: {
  children: ReactNode
  isAdmin: boolean
}) {
  const value = useMemo(() => ({ isAdmin, canEdit: isAdmin }), [isAdmin])
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
