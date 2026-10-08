import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'

export async function synchronizeSystemTheme(theme: 'light' | 'dark'): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await SystemBars.setStyle({
    style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
  })
}
