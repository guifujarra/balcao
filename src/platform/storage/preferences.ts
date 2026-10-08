import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import type { PreferenceStorage } from '../../application/ports/PreferenceStorage'

class BrowserPreferences implements PreferenceStorage {
  async get(key: string) {
    return window.localStorage.getItem(`balcao:${key}`)
  }
  async set(key: string, value: string) {
    window.localStorage.setItem(`balcao:${key}`, value)
  }
}

class NativePreferences implements PreferenceStorage {
  async get(key: string) {
    return (await Preferences.get({ key })).value
  }
  async set(key: string, value: string) {
    await Preferences.set({ key, value })
  }
}

export function createPreferenceStorage(): PreferenceStorage {
  return Capacitor.isNativePlatform() ? new NativePreferences() : new BrowserPreferences()
}
