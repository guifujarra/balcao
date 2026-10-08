import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { ArrowLeft, Flashlight, ShoppingBasket } from '../icons'

export function CameraScanner({
  title,
  selling,
  cartLabel,
  onClose,
  onManual,
  torchAvailable,
  torch,
  onTorch,
  children,
}: {
  title: string
  selling: boolean
  cartLabel: string
  onClose: () => void
  onManual: () => void
  torchAvailable: boolean
  torch: boolean
  onTorch: () => void
  children?: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const shell = document.querySelector<HTMLElement>('.app-shell')
    const wasInert = shell?.inert ?? false
    if (shell) shell.inert = true
    document.documentElement.classList.add('camera-open')
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => {
      document.documentElement.classList.remove('camera-open')
      if (shell) shell.inert = wasInert
      previous?.focus()
    }
  }, [])
  return createPortal(
    <div
      ref={panel}
      className="camera-scanner"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-title"
      aria-describedby="camera-instructions"
      data-scan-active="true"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
        if (event.key !== 'Tab') return
        const buttons = panel.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
        if (!buttons?.length) return
        const first = buttons[0]!
        const last = buttons[buttons.length - 1]!
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
    >
      <div
        id="balcao-camera"
        className="camera-scanner-preview"
        role="group"
        aria-label="Imagem da câmera"
      />
      <div className="camera-aim" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <header className="camera-scanner-header">
        <Button
          variant="ghost"
          onClick={onClose}
          aria-label={selling ? 'Voltar ao carrinho' : 'Voltar ao estoque'}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        <h1 id="camera-title">{title}</h1>
        {torchAvailable && (
          <Button variant="ghost" onClick={onTorch} aria-label="Lanterna" aria-pressed={torch}>
            <Flashlight aria-hidden="true" />
          </Button>
        )}
      </header>
      <div className="camera-scanner-footer stack">
        <p id="camera-instructions">
          {selling
            ? 'Enquadre o código. Depois, leia o próximo produto.'
            : 'Enquadre o código do produto.'}
        </p>
        {children}
        <div className="camera-scanner-actions">
          <Button variant="secondary" onClick={onManual}>
            Digitar código
          </Button>
          {selling && (
            <Button onClick={onClose}>
              <ShoppingBasket aria-hidden="true" />
              {cartLabel}
            </Button>
          )}
        </div>
        {selling && <small>Para repetir o produto, afaste o código e aponte novamente.</small>}
      </div>
    </div>,
    document.body,
  )
}
