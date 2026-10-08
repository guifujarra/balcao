import type { ReactNode } from 'react'
import { ArrowUpRight } from '../icons'
import { Button } from './Button'
import type { Tone } from './Feedback'

export function ActionTile({
  label,
  description,
  icon,
  prominent = false,
  onClick,
}: {
  label: string
  description: string
  icon: ReactNode
  prominent?: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant={prominent ? 'primary' : 'secondary'}
      className="action-tile"
      aria-label={`${label}. ${description}`}
      onClick={onClick}
    >
      <span className="action-tile-icon" aria-hidden="true">
        {icon}
      </span>
      <span>
        <strong>{label}</strong>
        <span className="action-tile-description">{description}</span>
      </span>
    </Button>
  )
}

export function StatusTile({
  label,
  value,
  detail,
  icon,
  tone = 'neutral',
  onClick,
}: {
  label: string
  value: string
  detail: string
  icon: ReactNode
  tone?: Tone
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`status-tile tone-${tone}`}
      aria-label={`${value} ${label}. ${detail}`}
      onClick={(event) => {
        event.currentTarget.focus({ preventScroll: true })
        onClick()
      }}
    >
      <span className="status-tile-top">
        <span aria-hidden="true">{icon}</span>
        <ArrowUpRight aria-hidden="true" />
      </span>
      <strong className="status-tile-value">{value}</strong>
      <strong>{label}</strong>
      <span className="status-tile-detail">{detail}</span>
    </button>
  )
}
