import { AppServicesProvider } from './AppServicesProvider'
import { ToastProvider } from './ToastProvider'
import { createDemoServices } from '../bootstrap/createDemoServices'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from './ThemeProvider'
import { SettingsPage } from '../../features/settings/SettingsPage'
import { isThemePreference } from './theme-context'

describe('preferência de aparência', () => {
  it('restaura a preferência e salva a nova escolha pela porta de armazenamento', async () => {
    const storage = { get: vi.fn(), set: vi.fn().mockResolvedValue(undefined) }
    render(
      <ThemeProvider storage={storage} initialPreference="dark">
        <AppServicesProvider services={createDemoServices()}>
          <ToastProvider>
            <SettingsPage />
          </ToastProvider>
        </AppServicesProvider>
      </ThemeProvider>,
    )
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    await userEvent.click(screen.getByRole('radio', { name: /Claro/ }))
    expect(storage.set).toHaveBeenCalledWith('theme', 'light')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })
  it('aplica o tema mesmo quando não é possível persistir', async () => {
    const storage = {
      get: vi.fn(),
      set: vi.fn().mockRejectedValue(new Error('Armazenamento bloqueado')),
    }
    render(
      <ThemeProvider storage={storage}>
        <AppServicesProvider services={createDemoServices()}>
          <ToastProvider>
            <SettingsPage />
          </ToastProvider>
        </AppServicesProvider>
      </ThemeProvider>,
    )
    await userEvent.click(screen.getByRole('radio', { name: /Escuro/ }))
    await waitFor(() =>
      expect(screen.getByText('Preferência aplicada nesta sessão')).toBeInTheDocument(),
    )
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })
  it('rejeita valores inválidos recebidos do armazenamento', () => {
    expect(isThemePreference('system')).toBe(true)
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('invalid')).toBe(false)
    expect(isThemePreference(null)).toBe(false)
  })
})
