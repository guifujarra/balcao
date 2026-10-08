import { useCallback, useEffect, useState } from 'react'
import { useAppServices } from '../../app/providers/services-context'
import type { StoreState } from '../../domain/model'
import { onStoreChange } from '../../application/services/storeEvents'
import { useToast } from '../../app/providers/toast-context'
export function useStoreData() {
  const { operations } = useAppServices()
  const [data, setData] = useState<StoreState | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { notify } = useToast()
  const reload = useCallback(async () => {
    if (!operations) return
    try {
      const next = await operations.read()
      setData(next)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar os dados.')
    }
  }, [operations])
  useEffect(() => {
    let alive = true
    if (operations)
      void operations.read().then(
        (next) => {
          if (alive) setData(next)
        },
        (e) => {
          if (alive) setError(String(e))
        },
      )
    const stop = onStoreChange(() => {
      if (alive) void reload()
    })
    const focus = () => {
      if (alive) void reload()
    }
    window.addEventListener('focus', focus)
    return () => {
      alive = false
      stop()
      window.removeEventListener('focus', focus)
    }
  }, [operations, reload])
  async function run(action: () => Promise<unknown>, message: string) {
    if (busy) return false
    setBusy(true)
    setError('')
    try {
      await action()
      await reload()
      notify(message)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
      return false
    } finally {
      setBusy(false)
    }
  }
  return { operations, data, error, busy, reload, run }
}
