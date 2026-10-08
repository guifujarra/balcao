import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react'
import { Search } from '../icons'

interface FieldProps {
  label: string
  hint?: string
  error?: string
}
interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldProps {
  startIcon?: ReactNode
}

export function Input({
  label,
  hint,
  error,
  startIcon,
  id: givenId,
  className = '',
  ...props
}: InputProps) {
  const generatedId = useId()
  const id = givenId ?? generatedId
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
      </label>
      <div className={`input-wrap ${error ? 'input-wrap--error' : ''}`}>
        {startIcon && (
          <span className="input-icon" aria-hidden="true">
            {startIcon}
          </span>
        )}
        <input
          {...props}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-message` : undefined}
        />
      </div>
      {(error || hint) && (
        <p
          id={`${id}-message`}
          className={`field-message ${error ? 'field-message--error' : ''}`}
          role={error ? 'alert' : undefined}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

export function SearchField(props: Omit<InputProps, 'type' | 'startIcon'>) {
  return <Input {...props} type="search" startIcon={<Search />} />
}

export function NumberField(props: Omit<InputProps, 'type'>) {
  return <Input inputMode="decimal" {...props} type="number" />
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldProps {}

export function Select({ label, hint, error, id: givenId, children, ...props }: SelectProps) {
  const generatedId = useId()
  const id = givenId ?? generatedId
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? `${id}-message` : undefined}
      >
        {children}
      </select>
      {(error || hint) && (
        <p
          id={`${id}-message`}
          className={`field-message ${error ? 'field-message--error' : ''}`}
          role={error ? 'alert' : undefined}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
