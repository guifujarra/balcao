import { useRef, useState } from 'react'
import { useToast } from '../../app/providers/toast-context'
export function useMutation() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const { notify } = useToast()
  async function run(action: () => Promise<unknown>, message: string) {
    if (pending.current) return false
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await action()
      notify(message)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
      return false
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return { busy, error, run }
}
