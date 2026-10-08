import { createContext, useContext } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export interface ThemeContextValue {
  preference: ThemePreference
  resolvedTheme: 'light' | 'dark'
  storageError: boolean
  setPreference: (theme: ThemePreference) => void
}
export const ThemeContext = createContext<ThemeContextValue | null>(null)
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme precisa de ThemeProvider')
  return context
}
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}
