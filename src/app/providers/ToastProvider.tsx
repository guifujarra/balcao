import { runtime } from '../../platform/storage/runtime'
import { successFeedback } from '../../platform/feedback/haptics'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Toast } from '../../design-system/components/Toast'
import { ToastContext, type ToastMessage } from './toast-context'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setMessages((current) => current.filter((message) => message.id !== id))
  }, [])
  const notify = useCallback(
    (message: string, tone: ToastMessage['tone'] = 'success', duration = 6000, compact = false) => {
      const id = runtime.id()
      if (tone === 'success') void successFeedback()
      if (compact) {
        timers.current.forEach(clearTimeout)
        timers.current.clear()
      }
      setMessages((current) =>
        compact ? [{ id, message, tone, compact }] : [...current.slice(-2), { id, message, tone }],
      )
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      )
    },
    [dismiss],
  )
  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      activeTimers.forEach(clearTimeout)
      activeTimers.clear()
    }
  }, [])
  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        className="toast-region"
        role="region"
        aria-label="Notificações"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.map((message) => (
          <Toast
            key={message.id}
            message={message.message}
            tone={message.tone}
            compact={message.compact}
            onDismiss={() => dismiss(message.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
