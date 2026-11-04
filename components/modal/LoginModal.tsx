'use client'

import { LogIn, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { login } from '@/app/actions/auth'
import { AuthField } from '@/components/auth/AuthFormParts'
import { useI18n } from '@/lib/i18n/useI18n'

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<
    'loginInvalidCredentials' | 'loginFailed' | null
  >(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    dialog?.querySelector('input')?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      const success = await login(username, password)
      if (!success) {
        setError('loginInvalidCredentials')
        return
      }
      // Setting the server cookie also refreshes permissions on this page.
      onClose()
    } catch {
      setError('loginFailed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby='login-title'
      aria-describedby='login-description'
      aria-busy={isSubmitting}
      onCancel={(event) => {
        event.preventDefault()
        if (!isSubmitting) onClose()
      }}
      onKeyDownCapture={(event) => {
        if (event.key === 'Escape') event.stopPropagation()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
      className='fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-sm text-primary backdrop:bg-primary/40 backdrop:backdrop-blur-sm open:flex open:items-center open:justify-center sm:p-6'>
      <div className='relative flex h-full w-full flex-col justify-center overflow-y-auto bg-surface p-6 text-sm sm:h-auto sm:max-h-full sm:max-w-md sm:rounded-3xl sm:border sm:border-border sm:p-8'>
        <button
          type='button'
          onClick={onClose}
          disabled={isSubmitting}
          aria-label={t('close')}
          className='absolute top-4 right-4 rounded-full p-2 text-secondary transition-colors hover:bg-neutral disabled:opacity-50'>
          <X className='size-5' />
        </button>
        <h2
          id='login-title'
          className='font-serif text-2xl font-semibold text-primary'>
          {t('loginTitle')}
        </h2>
        <p id='login-description' className='mt-2 text-secondary'>
          {t('loginDescription')}
        </p>
        <form onSubmit={handleSubmit} className='mt-6 space-y-4'>
          <AuthField
            id='login-username'
            label={t('username')}
            type='text'
            autoComplete='username'
            required
            value={username}
            onChange={setUsername}
            disabled={isSubmitting}
          />
          <AuthField
            id='login-password'
            label={t('password')}
            type='password'
            autoComplete='current-password'
            required
            value={password}
            onChange={setPassword}
            disabled={isSubmitting}
          />
          {error && (
            <p role='alert' className='text-error'>
              {t(error)}
            </p>
          )}
          <div className='flex gap-3 pt-2'>
            <button
              type='button'
              onClick={onClose}
              disabled={isSubmitting}
              className='btn-outline flex-1 disabled:opacity-50'>
              {t('cancel')}
            </button>
            <button
              type='submit'
              disabled={isSubmitting}
              className='btn-primary flex-1 disabled:opacity-50'>
              <LogIn className='size-4' />
              {isSubmitting ? t('loggingIn') : t('login')}
            </button>
          </div>
        </form>
      </div>
    </dialog>,
    document.body
  )
}
