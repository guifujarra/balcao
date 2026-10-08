import { createLocalServices } from './createLocalServices'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router'
import { Capacitor } from '@capacitor/core'
import { AppRoutes } from '../routes/AppRoutes'
import { ThemeProvider } from '../providers/ThemeProvider'
import { ToastProvider } from '../providers/ToastProvider'
import { AppErrorBoundary } from '../providers/AppErrorBoundary'
import { createPreferenceStorage } from '../../platform/storage/preferences'
import { isThemePreference, type ThemePreference } from '../providers/theme-context'
import { synchronizeSystemTheme } from '../../platform/appearance/systemBars'
import { createDemoServices } from './createDemoServices'
import { readDemoScenario } from '../../infrastructure/demo/DemoDashboardRepository'
import { AppServicesProvider } from '../providers/AppServicesProvider'

export async function bootstrap() {
  const container = document.getElementById('root')
  if (!container) throw new Error('Raiz do aplicativo não encontrada')
  const storage = createPreferenceStorage()
  let initialPreference: ThemePreference = 'light'
  let initialStorageError = false
  try {
    const saved = await storage.get('theme')
    if (isThemePreference(saved)) initialPreference = saved
  } catch {
    initialStorageError = true
  }
  document.documentElement.dataset.theme =
    initialPreference === 'system'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : initialPreference
  const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter
  const previewParams = new URLSearchParams(
    Capacitor.isNativePlatform() ? window.location.hash.split('?')[1] : window.location.search,
  )
  const requestedPreview = previewParams.get('preview')
  if (requestedPreview === 'off') sessionStorage.removeItem('balcao-preview')
  else if (requestedPreview) sessionStorage.setItem('balcao-preview', requestedPreview)
  const preview = requestedPreview === 'off' ? null : sessionStorage.getItem('balcao-preview')
  const services = preview
    ? createDemoServices(readDemoScenario(preview))
    : await createLocalServices()
  createRoot(container).render(
    <StrictMode>
      <AppErrorBoundary>
        <ThemeProvider
          storage={storage}
          initialPreference={initialPreference}
          initialStorageError={initialStorageError}
          onResolvedTheme={synchronizeSystemTheme}
        >
          <ToastProvider>
            <AppServicesProvider services={services}>
              <Router>
                <AppRoutes />
              </Router>
            </AppServicesProvider>
          </ToastProvider>
        </ThemeProvider>
      </AppErrorBoundary>
    </StrictMode>,
  )
}
