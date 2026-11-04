import type { ReactNode } from 'react'

import DashboardHeader from '@/components/DashboardHeader'
import { UserProvider } from '@/components/UserProvider'
import { getIsAdmin } from '@/utils/supabase/queries'

export default async function DashboardLayout({
  children
}: {
  children: ReactNode
}) {
  const isAdmin = await getIsAdmin()

  return (
    <UserProvider isAdmin={isAdmin}>
      <div className='flex min-h-screen flex-col bg-neutral font-sans text-primary print:bg-white'>
        <DashboardHeader />
        {children}
      </div>
    </UserProvider>
  )
}
