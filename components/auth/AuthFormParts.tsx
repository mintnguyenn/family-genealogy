'use client'

const inputClasses =
  'w-full rounded-xl border border-border bg-neutral p-4 text-sm text-primary outline-none focus:border-tertiary disabled:opacity-50'

export function AuthField({
  id,
  label,
  type,
  autoComplete,
  required,
  disabled,
  value,
  onChange
}: {
  id: string
  label: string
  type: string
  autoComplete?: string
  required?: boolean
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
        <input
          id={id}
          name={id}
          type={type}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className={inputClasses}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
