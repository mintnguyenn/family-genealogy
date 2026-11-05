'use client'

import { LogOut } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

import { logout } from '@/app/actions/auth'
import { useI18n } from '@/lib/i18n/useI18n'
import { memberSearchCache } from '@/utils/memberSearchCache'

export default function LogoutButton({
  onSuccess
}: {
  onSuccess?: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useI18n()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setHasError(false)
    try {
      await logout()
      memberSearchCache.clear()
      // Forms have no read-only mode; return to the corresponding reading page.
      if (pathname === '/dashboard/members/new') {
        router.replace('/dashboard/members')
      } else if (/^\/dashboard\/members\/[^/]+\/edit$/.test(pathname)) {
        router.replace(pathname.slice(0, -5))
      }
      onSuccess?.()
    } catch (error) {
      console.error('Lỗi đăng xuất:', error)
      setHasError(true)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className='flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-rose-50 hover:text-rose-700'>
        <LogOut className='size-4' />
        {isLoggingOut ? t('processing') : t('logout')}
      </button>
      {hasError && (
        <p role='alert' className='px-4 py-2 text-sm text-error'>
          {t('logoutFailed')}
        </p>
      )}
    </>
  )
}
