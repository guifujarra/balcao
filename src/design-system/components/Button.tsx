import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle } from '../icons'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  loading = false,
  icon,
  children,
  className = '',
  fullWidth = false,
  disabled,
  type = 'button',
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(event) => {
        event.currentTarget.focus({ preventScroll: true })
        onClick?.(event)
      }}
      className={`button button--${variant} ${fullWidth ? 'button--full' : ''} ${className}`}
    >
      {loading ? <LoaderCircle className="spinner" aria-hidden="true" /> : icon}
      {children}
      {loading && <span className="sr-only">, aguarde</span>}
    </button>
  )
}

interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon'> {
  label: string
  children: ReactNode
}

export function IconButton({
  label,
  children,
  className = '',
  variant = 'ghost',
  ...props
}: IconButtonProps) {
  return (
    <Button
      {...props}
      variant={variant}
      aria-label={label}
      title={label}
      className={`icon-button ${className}`}
    >
      {children}
    </Button>
  )
}
