import { useEffect, useState, type ReactNode } from 'react'
import type { PreferenceStorage } from '../../application/ports/PreferenceStorage'
import { ThemeContext, type ThemePreference } from './theme-context'

export function ThemeProvider({
  children,
  storage,
  initialPreference = 'light',
  initialStorageError = false,
  onResolvedTheme,
}: {
  children: ReactNode
  storage: PreferenceStorage
  initialPreference?: ThemePreference
  initialStorageError?: boolean
  onResolvedTheme?: (theme: 'light' | 'dark') => Promise<void>
}) {
  const [preference, setTheme] = useState<ThemePreference>(initialPreference)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const [storageError, setStorageError] = useState(initialStorageError)
  const resolvedTheme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const change = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-canvas')
      .trim()
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
    void onResolvedTheme?.(resolvedTheme).catch((error) =>
      console.error('Falha ao atualizar aparência nativa', error),
    )
  }, [resolvedTheme, onResolvedTheme])
  function setPreference(theme: ThemePreference) {
    setTheme(theme)
    void storage.set('theme', theme).then(
      () => setStorageError(false),
      () => setStorageError(true),
    )
  }
  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, storageError, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}
