'use client'

import type { ReactNode } from 'react'

const inputClasses =
  'w-full rounded-xl border border-border bg-neutral p-4 text-sm text-primary outline-none focus:border-tertiary disabled:opacity-50'

export function AuthField({
  id,
  label,
  icon,
  type,
  autoComplete,
  required,
  placeholder,
  disabled,
  value,
  onChange
}: {
  id: string
  label: string
  icon?: ReactNode
  type: string
  autoComplete?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className='relative'>
      <label
        htmlFor={id}
        className='mb-2 block text-sm font-medium text-primary'>
        {label}
      </label>
      <div className='group relative flex items-center'>
        {icon && (
          <span className='absolute left-3.5 size-5 text-stone-400 transition-colors group-focus-within:text-amber-500'>
            {icon}
          </span>
        )}
        <input
          id={id}
          name={id}
          type={type}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className={`${inputClasses}${icon ? 'pl-11' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
