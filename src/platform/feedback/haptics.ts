import { Capacitor } from '@capacitor/core'
export async function successFeedback() {
  if (!Capacitor.isNativePlatform()) {
    navigator.vibrate?.(35)
    return
  }
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    /* O feedback visual continua disponível em dispositivos sem vibração. */
  }
}
