import type { ReactNode } from 'react'
import { Button } from './Button'
import { Alert, ErrorState, LoadingState } from './Feedback'
export function PageTitle({
  label,
  title,
  description,
  action,
}: {
  label: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="workspace-heading">
      <div className="page-heading">
        <p className="eyebrow muted">{label}</p>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  )
}
export function DataBoundary({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean
  error: string
  retry: () => void
  children: ReactNode
}) {
  if (loading)
    return error ? (
      <ErrorState description={error} onRetry={retry} />
    ) : (
      <LoadingState label="Abrindo os dados da loja…" />
    )
  return (
    <>
      {error && (
        <Alert tone="danger" title="Não foi possível concluir">
          {error}
        </Alert>
      )}
      {children}
    </>
  )
}
export function SaveButton({ busy, children = 'Salvar' }: { busy: boolean; children?: ReactNode }) {
  return (
    <Button type="submit" disabled={busy}>
      {busy ? 'Salvando…' : children}
    </Button>
  )
}
export function RecordList({ children }: { children: ReactNode }) {
  return <div className="record-list surface">{children}</div>
}
export function RecordRow({
  title,
  detail,
  value,
  actions,
}: {
  title: string
  detail?: ReactNode
  value?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="record-row">
      <div className="record-main">
        <strong>{title}</strong>
        {detail && <div className="muted text-small">{detail}</div>}
      </div>
      {value && <strong className="record-value">{value}</strong>}
      {actions && <div className="record-actions">{actions}</div>}
    </div>
  )
}
