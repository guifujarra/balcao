import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ native: true, write: vi.fn(), share: vi.fn() }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mock.native } }))
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: mock.write },
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
}))
vi.mock('@capacitor/share', () => ({ Share: { share: mock.share } }))
import { files } from './files'
beforeEach(() => {
  vi.clearAllMocks()
  mock.native = true
  mock.write.mockResolvedValue({ uri: 'file:///cache/produto.png' })
  mock.share.mockResolvedValue({})
})
describe('exportação da imagem do QR', () => {
  it('grava PNG binário e abre o compartilhamento nativo com o arquivo', async () => {
    expect(await files.shareImage('produto.png', 'data:image/png;base64,iVBORw==', 'Doce')).toBe(
      'shared',
    )
    expect(mock.write).toHaveBeenCalledWith({
      path: 'produto.png',
      data: 'iVBORw==',
      directory: 'CACHE',
    })
    expect(mock.share).toHaveBeenCalledWith({
      title: 'Doce',
      files: ['file:///cache/produto.png'],
      dialogTitle: 'Compartilhar QR code',
    })
  })
  it('trata o cancelamento sem informar sucesso', async () => {
    mock.share.mockRejectedValue(new Error('Share canceled'))
    expect(await files.shareImage('produto.png', 'data:image/png;base64,iVBORw==', 'Doce')).toBe(
      'cancelled',
    )
  })
  it('compartilha um arquivo PNG no navegador quando o sistema suporta', async () => {
    mock.native = false
    const share = vi.fn<(data: ShareData) => Promise<void>>(async () => undefined)
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    expect(await files.shareImage('produto.png', 'data:image/png;base64,aGVsbG8=', 'Doce')).toBe(
      'shared',
    )
    const data = share.mock.calls[0]?.[0] as unknown as { title: string; files: File[] }
    expect(data.title).toBe('Doce')
    expect(data.files[0]?.name).toBe('produto.png')
    expect(data.files[0]?.type).toBe('image/png')
    expect(mock.write).not.toHaveBeenCalled()
  })
})
