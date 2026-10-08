import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from '../icons'
import { Button, IconButton } from './Button'

interface OverlayProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

function DialogSurface({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  kind,
}: OverlayProps & { kind: 'modal' | 'sheet' }) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    const previousFocus = document.activeElement
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [open])
  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
      ),
    ).filter((element) => element.getClientRects().length > 0)
    const first = focusable[0]
    const last = focusable.at(-1)
    if (!first || !last) {
      event.preventDefault()
      event.currentTarget.focus()
      return
    }
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === event.currentTarget)
    ) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  return createPortal(
    <dialog
      ref={ref}
      tabIndex={-1}
      onKeyDown={keepFocusInside}
      className={`dialog dialog--${kind}`}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog-inner">
        {kind === 'sheet' && <div className="sheet-handle" aria-hidden="true" />}
        <header className="dialog-header">
          <div>
            <h2 id={`${id}-title`}>{title}</h2>
            {description && (
              <p id={`${id}-description`} className="muted">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Fechar janela" onClick={onClose}>
            <X aria-hidden="true" />
          </IconButton>
        </header>
        <div className="dialog-content">{children}</div>
        {footer && <footer className="dialog-footer">{footer}</footer>}
      </div>
    </dialog>,
    document.body,
  )
}

export function Modal(props: OverlayProps) {
  return <DialogSurface {...props} kind="modal" />
}
export function BottomSheet(props: OverlayProps) {
  return <DialogSurface {...props} kind="sheet" />
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  onConfirm,
  onClose,
}: Omit<OverlayProps, 'children' | 'footer'> & { confirmLabel?: string; onConfirm: () => void }) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="muted">Revise a ação antes de continuar.</p>
    </Modal>
  )
}
