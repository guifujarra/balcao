import { onStoreChange } from '../../application/services/storeEvents'
import { useEffect, useState } from 'react'
import type { DashboardSummary } from '../../application/dashboard/DashboardRepository'
import { useAppServices } from '../../app/providers/services-context'
import { presentDashboard } from './dashboardPresentation'

type DashboardState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; summary: DashboardSummary }

export function useDashboard() {
  const { dashboard, store, dataMode } = useAppServices()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<DashboardState>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    void dashboard.execute(controller.signal).then(
      (summary) => {
        if (!controller.signal.aborted) setState({ status: 'ready', summary })
      },
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      },
    )
    return () => controller.abort()
  }, [dashboard, attempt])
  useEffect(() => {
    const refresh = () => setAttempt((value) => value + 1)
    const stop = onStoreChange(refresh)
    window.addEventListener('focus', refresh)
    return () => {
      stop()
      window.removeEventListener('focus', refresh)
    }
  }, [])
  function reload() {
    setState({ status: 'loading' })
    setAttempt((value) => value + 1)
  }
  return {
    state,
    view: state.status === 'ready' ? presentDashboard(state.summary, store) : null,
    reload,
    isDemo: dataMode === 'demonstration',
  }
}
