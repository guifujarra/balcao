import { CheckCircle2, TriangleAlert, X } from '../icons'
import { IconButton } from './Button'

export function Toast({
  message,
  tone = 'success',
  onDismiss,
  compact = false,
}: {
  message: string
  tone?: 'success' | 'error'
  onDismiss: () => void
  compact?: boolean
}) {
  return (
    <div className={`toast toast--${tone} ${compact ? 'toast--compact' : ''}`}>
      <span className="toast-symbol" aria-hidden="true">
        {tone === 'error' ? <TriangleAlert /> : <CheckCircle2 />}
      </span>
      <p>{message}</p>
      {!compact && (
        <IconButton label="Dispensar notificação" onClick={onDismiss}>
          <X aria-hidden="true" />
        </IconButton>
      )}
    </div>
  )
}
