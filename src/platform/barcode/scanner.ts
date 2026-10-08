import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import {
  BarcodeScanner as NativeScanner,
  LensFacing,
  Resolution,
} from '@capacitor-mlkit/barcode-scanning'
import type { Html5Qrcode } from 'html5-qrcode'
import type { ScannerPort } from '../../application/ports/ScannerPort'

/** A câmera nativa fica atrás da interface. Cada sessão entrega leituras sucessivas. */
export class BarcodeScanner implements ScannerPort {
  private camera: Html5Qrcode | null = null
  private generation = 0
  private transition = Promise.resolve()
  private nativeActive = false
  private listeners: PluginListenerHandle[] = []
  private get native() {
    return Capacitor.getPlatform() === 'android'
  }

  unavailableReason() {
    if (this.native) return null
    return !Capacitor.isNativePlatform() && !window.isSecureContext
      ? 'Neste endereço HTTP, o navegador bloqueia a câmera. Use o aplicativo instalado ou um endereço HTTPS. A digitação de código continua disponível.'
      : !navigator.mediaDevices?.getUserMedia
        ? 'A câmera não está disponível neste dispositivo. Você pode digitar o código.'
        : null
  }
  private serialize(action: () => Promise<void>) {
    const next = this.transition.then(action)
    this.transition = next.catch(() => undefined)
    return next
  }
  startScan(
    elementId: string,
    onCodeDetected: (code: string) => void,
    onError: (message: string) => void,
  ) {
    const token = ++this.generation
    return this.serialize(async () => {
      await this.release()
      if (token !== this.generation) return
      const reason = this.unavailableReason()
      if (reason) {
        onError(reason)
        return
      }
      const seen = new Map<string, { seen: number; delivered: number }>()
      const receive = (value: string) => {
        if (token !== this.generation || !value.trim()) return
        const now = Date.now()
        const previous = seen.get(value)
        seen.set(value, { seen: now, delivered: previous?.delivered ?? now })
        // Manter o código na imagem conta uma vez; afastá-lo permite repetir.
        if (previous && (now - previous.seen < 800 || now - previous.delivered < 1500)) return
        seen.set(value, { seen: now, delivered: now })
        onCodeDetected(value)
      }
      try {
        if (this.native) {
          let permission = await NativeScanner.checkPermissions()
          if (token !== this.generation) return
          if (permission.camera !== 'granted') permission = await NativeScanner.requestPermissions()
          if (token !== this.generation) return
          if (permission.camera !== 'granted') throw new Error('permission')
          this.listeners.push(
            await NativeScanner.addListener('barcodesScanned', ({ barcodes }) => {
              // Um alvo por leitura evita incluir produtos vizinhos na mesma imagem.
              const candidates = barcodes.filter((barcode) => barcode.rawValue)
              const aim = document.querySelector('.camera-aim')?.getBoundingClientRect()
              const distance = (points?: number[][]) => {
                if (!points?.length) return Infinity
                const x = points.reduce((sum, point) => sum + point[0]!, 0) / points.length
                const y = points.reduce((sum, point) => sum + point[1]!, 0) / points.length
                return Math.hypot(
                  x -
                    (aim ? aim.left + aim.width / 2 : window.innerWidth / 2) *
                      window.devicePixelRatio,
                  y -
                    (aim ? aim.top + aim.height / 2 : window.innerHeight / 2) *
                      window.devicePixelRatio,
                )
              }
              candidates.sort((a, b) => distance(a.cornerPoints) - distance(b.cornerPoints))
              if (candidates[0]?.rawValue) receive(candidates[0].rawValue)
            }),
          )
          if (token !== this.generation) {
            await this.release()
            return
          }
          this.listeners.push(
            await NativeScanner.addListener('scanError', () => {
              if (token !== this.generation) return
              void this.stopScan()
              onError('A câmera interrompeu a leitura. Abra a câmera novamente ou digite o código.')
            }),
          )
          if (token !== this.generation) {
            await this.release()
            return
          }
          this.nativeActive = true
          await NativeScanner.startScan({
            lensFacing: LensFacing.Back,
            resolution: Resolution['1280x720'],
          })
        } else {
          const { Html5Qrcode } = await import('html5-qrcode')
          if (token !== this.generation) return
          this.camera = new Html5Qrcode(elementId, { verbose: false })
          await this.camera.start(
            { facingMode: 'environment' },
            {
              fps: 12,
              disableFlip: false,
              videoConstraints: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            },
            receive,
            () => undefined,
          )
        }
        if (token !== this.generation) await this.release()
      } catch {
        await this.release()
        if (token === this.generation)
          onError(
            'Não foi possível acessar a câmera. Confira a permissão do aplicativo/navegador ou digite o código.',
          )
      }
    })
  }
  async torchAvailable() {
    if (!this.native || !this.nativeActive) return false
    return (await NativeScanner.isTorchAvailable().catch(() => ({ available: false }))).available
  }
  async setTorch(enabled: boolean) {
    if (!this.nativeActive) return
    if (enabled) await NativeScanner.enableTorch()
    else await NativeScanner.disableTorch()
  }
  stopScan() {
    ++this.generation // Cancela inclusive uma abertura ainda aguardando permissão.
    return this.serialize(() => this.release())
  }
  private async release() {
    const listeners = this.listeners.splice(0)
    await Promise.all(listeners.map((listener) => listener.remove().catch(() => undefined)))
    if (this.nativeActive) {
      this.nativeActive = false
      await NativeScanner.stopScan().catch(() => undefined)
    }
    const camera = this.camera
    this.camera = null
    if (camera?.isScanning) await camera.stop().catch(() => undefined)
    if (camera) {
      try {
        camera.clear()
      } catch {
        /* A rota pode já ter sido desmontada. */
      }
    }
  }
}
