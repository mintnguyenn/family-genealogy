import type { ReactNode } from 'react'

import DashboardHeader from '@/components/DashboardHeader'
import { UserProvider } from '@/components/UserProvider'
import { getIsAdmin } from '@/lib/auth'
import { getServerTranslations } from '@/lib/i18n/server'

export default async function DashboardLayout({
  children
}: {
  children: ReactNode
}) {
  const isAdmin = await getIsAdmin()
  const { t } = await getServerTranslations()

  return (
    <UserProvider isAdmin={isAdmin}>
      <div className='flex min-h-screen flex-col bg-neutral font-sans text-primary print:bg-white'>
        <DashboardHeader />
        <p
          role='status'
          className='border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800 print:hidden'>
          {t('databaseNotConnected')}
        </p>
        {children}
      </div>
    </UserProvider>
  )
}
