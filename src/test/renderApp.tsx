import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { ReactNode } from 'react'
import { ThemeProvider } from '../app/providers/ThemeProvider'
import { ToastProvider } from '../app/providers/ToastProvider'
import type { PreferenceStorage } from '../application/ports/PreferenceStorage'
import type { AppServices } from '../application/services/AppServices'
import { AppServicesProvider } from '../app/providers/AppServicesProvider'
import { createDemoServices } from '../app/bootstrap/createDemoServices'

export function renderApp(
  ui: ReactNode,
  path = '/',
  services: AppServices = createDemoServices('ready', 0),
) {
  const storage: PreferenceStorage = {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve(),
  }
  return render(
    <ThemeProvider storage={storage}>
      <ToastProvider>
        <AppServicesProvider services={services}>
          <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
        </AppServicesProvider>
      </ToastProvider>
    </ThemeProvider>,
  )
}
