import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({
  platform: 'web',
  receive: (() => undefined) as (value: string) => void,
  stop: vi.fn(),
  clear: vi.fn(),
  start: vi.fn(),
  permission: vi.fn(),
  request: vi.fn(),
  nativeStart: vi.fn(),
  nativeStop: vi.fn(),
  remove: vi.fn(),
  torch: vi.fn(),
  enabled: vi.fn(),
  events: new Map<string, (event: { barcodes?: { rawValue: string }[] }) => void>(),
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => mock.platform, isNativePlatform: () => mock.platform !== 'web' },
}))
vi.mock('@capacitor-mlkit/barcode-scanning', () => ({
  LensFacing: { Back: 'BACK' },
  Resolution: { '1280x720': 1 },
  BarcodeScanner: {
    checkPermissions: mock.permission,
    requestPermissions: mock.request,
    startScan: mock.nativeStart,
    stopScan: mock.nativeStop,
    isTorchAvailable: mock.torch,
    enableTorch: mock.enabled,
    disableTorch: vi.fn(),
    addListener: vi.fn(
      async (event: string, receive: (event: { barcodes?: { rawValue: string }[] }) => void) => {
        mock.events.set(event, receive)
        return { remove: mock.remove }
      },
    ),
  },
}))
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: class {
    isScanning = true
    async start(_camera: unknown, _options: unknown, receive: (code: string) => void) {
      mock.start(_camera, _options)
      mock.receive = receive
    }
    async stop() {
      mock.stop()
      this.isScanning = false
    }
    clear() {
      mock.clear()
    }
  },
}))
import { BarcodeScanner } from './scanner'
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-03T12:00:00Z'))
  vi.clearAllMocks()
  mock.platform = 'web'
  mock.events.clear()
  mock.permission.mockResolvedValue({ camera: 'granted' })
  mock.request.mockResolvedValue({ camera: 'granted' })
  mock.remove.mockResolvedValue(undefined)
  mock.nativeStop.mockResolvedValue(undefined)
  mock.nativeStart.mockResolvedValue(undefined)
  mock.torch.mockResolvedValue({ available: true })
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn() },
  })
})
afterEach(() => vi.useRealTimers())
describe('sessão de câmera contínua', () => {
  it('mantém a câmera aberta e evita repetir um código mantido na imagem', async () => {
    const scanner = new BarcodeScanner()
    const receive = vi.fn()
    await scanner.startScan('camera', receive, vi.fn())
    mock.receive('A')
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(100)
      mock.receive('A')
    }
    expect(receive.mock.calls).toEqual([['A']])
    expect(mock.stop).not.toHaveBeenCalled()
    mock.receive('B')
    expect(receive.mock.calls).toEqual([['A'], ['B']])
    vi.advanceTimersByTime(1600)
    mock.receive('A')
    expect(receive.mock.calls).toEqual([['A'], ['B'], ['A']])
    await scanner.stopScan()
    mock.receive('C')
    expect(receive).toHaveBeenCalledTimes(3)
    expect(mock.stop).toHaveBeenCalledTimes(1)
    expect(mock.start).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        videoConstraints: expect.objectContaining({ width: { ideal: 1280 } }),
      }),
    )
  })
  it('informa bloqueio de câmera em HTTP sem tentar capturar', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
    const error = vi.fn()
    await new BarcodeScanner().startScan('camera', vi.fn(), error)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('HTTP'))
  })
  it('no Android usa a câmera nativa sem depender de getUserMedia, com leitura contínua e lanterna', async () => {
    mock.platform = 'android'
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    const scanner = new BarcodeScanner()
    const receive = vi.fn()
    await scanner.startScan('camera', receive, vi.fn())
    expect(mock.start).not.toHaveBeenCalled()
    expect(mock.nativeStart).toHaveBeenCalledWith({ lensFacing: 'BACK', resolution: 1 })
    const emit = (value: string) =>
      mock.events.get('barcodesScanned')!({ barcodes: [{ rawValue: value }] })
    emit('789001')
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(100)
      emit('789001')
    }
    expect(receive).toHaveBeenCalledTimes(1)
    emit('app:v1:produto:123')
    vi.advanceTimersByTime(1600)
    emit('789001')
    expect(receive).toHaveBeenCalledTimes(3)
    expect(mock.nativeStop).not.toHaveBeenCalled()
    expect(await scanner.torchAvailable()).toBe(true)
    await scanner.setTorch(true)
    expect(mock.enabled).toHaveBeenCalledOnce()
    await scanner.stopScan()
    emit('late')
    expect(receive).toHaveBeenCalledTimes(3)
    expect(mock.remove).toHaveBeenCalledTimes(2)
    expect(mock.nativeStop).toHaveBeenCalledOnce()
  })
  it('não abre a câmera quando a permissão é negada', async () => {
    mock.platform = 'android'
    mock.permission.mockResolvedValue({ camera: 'denied' })
    mock.request.mockResolvedValue({ camera: 'denied' })
    const error = vi.fn()
    await new BarcodeScanner().startScan('camera', vi.fn(), error)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('permissão'))
    expect(mock.nativeStart).not.toHaveBeenCalled()
  })
  it('cancelar durante a permissão não deixa uma câmera aberta após sair', async () => {
    mock.platform = 'android'
    let complete!: (permission: { camera: string }) => void
    mock.permission.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    )
    const scanner = new BarcodeScanner()
    const error = vi.fn()
    const opening = scanner.startScan('camera', vi.fn(), error)
    await vi.waitFor(() => expect(mock.permission).toHaveBeenCalled())
    const closing = scanner.stopScan()
    complete({ camera: 'granted' })
    await Promise.all([opening, closing])
    expect(mock.nativeStart).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
  it('libera a câmera se a abertura nativa falha e permite tentar de novo', async () => {
    mock.platform = 'android'
    mock.nativeStart.mockRejectedValueOnce(new Error('camera busy'))
    const scanner = new BarcodeScanner()
    const error = vi.fn()
    await scanner.startScan('camera', vi.fn(), error)
    expect(mock.nativeStop).toHaveBeenCalledOnce()
    expect(mock.remove).toHaveBeenCalledTimes(2)
    expect(error).toHaveBeenCalledOnce()
    await scanner.startScan('camera', vi.fn(), error)
    expect(mock.nativeStart).toHaveBeenCalledTimes(2)
    await scanner.stopScan()
  })
})
