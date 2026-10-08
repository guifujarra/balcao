import { createContext, useContext } from 'react'

export interface ToastMessage {
  id: string
  message: string
  tone: 'success' | 'error'
  compact?: boolean
}
export interface ToastContextValue {
  notify: (
    message: string,
    tone?: ToastMessage['tone'],
    duration?: number,
    compact?: boolean,
  ) => void
}
export const ToastContext = createContext<ToastContextValue | null>(null)
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast precisa de ToastProvider')
  return context
}
