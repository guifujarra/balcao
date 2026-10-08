import type { ReactNode } from 'react'
import { CheckCircle2, Info, LoaderCircle, Package, TriangleAlert } from '../icons'
import { Button } from './Button'

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge tone-${tone}`}>{children}</span>
}

const alertIcons = {
  neutral: Info,
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: TriangleAlert,
}

export function Alert({
  title,
  children,
  tone = 'info',
}: {
  title: string
  children?: ReactNode
  tone?: Tone
}) {
  const Icon = alertIcons[tone]
  return (
    <div className={`alert tone-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {children && <div className="alert-description">{children}</div>}
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon = <Package />,
}: {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spinner" aria-hidden="true" />
      <span>{label}</span>
      <div className="skeleton-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Tente novamente em alguns instantes.',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div role="alert">
      <EmptyState
        title={title}
        description={description}
        icon={<TriangleAlert />}
        action={
          onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Tentar novamente
            </Button>
          )
        }
      />
    </div>
  )
}
