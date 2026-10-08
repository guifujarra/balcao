import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

export async function registerBackButton(onBack: () => void): Promise<() => void> {
  if (Capacitor.getPlatform() !== 'android') return () => undefined
  const listener = await App.addListener('backButton', onBack)
  return () => {
    void listener.remove()
  }
}

export async function minimizeApp(): Promise<void> {
  if (Capacitor.getPlatform() === 'android') await App.minimizeApp()
}
