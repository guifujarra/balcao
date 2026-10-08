import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from '../../design-system/components/Feedback'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Falha na interface', error, info.componentStack)
  }
  render() {
    if (this.state.failed)
      return (
        <main className="boot-error">
          <ErrorState
            title="Algo interrompeu o aplicativo"
            description="Recarregue para tentar novamente."
            onRetry={() => window.location.reload()}
          />
        </main>
      )
    return this.props.children
  }
}
