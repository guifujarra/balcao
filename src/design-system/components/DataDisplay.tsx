import type { ReactNode } from 'react'
import { ChevronRight, Package } from '../icons'
import { Badge, type Tone } from './Feedback'

interface ProductPresentation {
  name: string
  detail: string
  priceLabel: string
  quantityLabel: string
  status?: { label: string; tone: Tone }
}

export function ProductRow({
  product,
  onClick,
}: {
  product: ProductPresentation
  onClick?: () => void
}) {
  const content = (
    <>
      <span className="product-icon" aria-hidden="true">
        <Package />
      </span>
      <span className="product-copy">
        <strong>{product.name}</strong>
        <span>{product.detail}</span>
        {product.status && <Badge tone={product.status.tone}>{product.status.label}</Badge>}
      </span>
      <span className="product-numbers">
        <strong>{product.priceLabel}</strong>
        <span>{product.quantityLabel}</span>
      </span>
      {onClick && <ChevronRight aria-hidden="true" />}
    </>
  )
  return onClick ? (
    <button
      type="button"
      className="product-row"
      aria-label={`${product.name}, ${product.detail}, ${product.priceLabel}, ${product.quantityLabel}${product.status ? `, ${product.status.label}` : ''}`}
      onClick={(event) => {
        event.currentTarget.focus({ preventScroll: true })
        onClick()
      }}
    >
      {content}
    </button>
  ) : (
    <div className="product-row">{content}</div>
  )
}

export function ProductCard({
  product,
  action,
}: {
  product: ProductPresentation
  action?: ReactNode
}) {
  return (
    <article className="product-card surface">
      <div className="product-card-visual" aria-hidden="true">
        <Package />
      </div>
      <div className="stack">
        <div className="spread">
          <h3>{product.name}</h3>
          {product.status && <Badge tone={product.status.tone}>{product.status.label}</Badge>}
        </div>
        <p className="muted">{product.detail}</p>
        <div className="spread">
          <strong>{product.priceLabel}</strong>
          <span className="muted">{product.quantityLabel}</span>
        </div>
        {action}
      </div>
    </article>
  )
}

export function StatCard({
  label,
  value,
  detail,
  icon,
  highlighted = false,
  action,
}: {
  label: string
  value: string
  detail?: string
  icon?: ReactNode
  highlighted?: boolean
  action?: ReactNode
}) {
  return (
    <article className={`stat-card surface ${highlighted ? 'stat-card--highlighted' : ''}`}>
      <div className="spread">
        <span>{label}</span>
        <span className="muted" aria-hidden="true">
          {icon}
        </span>
      </div>
      <strong className="stat-value">{value}</strong>
      {detail && <span className="muted">{detail}</span>}
      {action}
    </article>
  )
}
