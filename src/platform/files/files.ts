import { Capacitor } from '@capacitor/core'
import type { FilePort } from '../../application/ports/FilePort'
function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
function pngBlob(dataUrl: string) {
  const bytes = Uint8Array.from(atob(dataUrl.split(',')[1] ?? ''), (value) => value.charCodeAt(0))
  return new Blob([bytes], { type: 'image/png' })
}
export const files: FilePort = {
  async save(name, type, contents) {
    if (Capacitor.isNativePlatform()) {
      const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share'),
      ])
      const result = await Filesystem.writeFile({
        path: name,
        data: contents,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      })
      await Share.share({
        title: 'Backup do Balcão',
        files: [result.uri],
        dialogTitle: 'Salvar backup',
      })
    } else {
      download(name, new Blob([contents], { type }))
    }
  },
  async shareImage(name, dataUrl, title) {
    if (Capacitor.isNativePlatform()) {
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share'),
      ])
      const result = await Filesystem.writeFile({
        path: name,
        data: dataUrl.split(',')[1] ?? '',
        directory: Directory.Cache,
      })
      try {
        await Share.share({ title, files: [result.uri], dialogTitle: 'Compartilhar QR code' })
        return 'shared'
      } catch (error) {
        if (error instanceof Error && /cancel/i.test(error.message)) return 'cancelled'
        throw error
      }
    }
    const file = new File([pngBlob(dataUrl)], name, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title, files: [file] })
        return 'shared'
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
        throw error
      }
    }
    download(name, file)
    return 'downloaded'
  },
  ...(!Capacitor.isNativePlatform()
    ? {
        async downloadImage(name: string, dataUrl: string) {
          download(name, pngBlob(dataUrl))
        },
      }
    : {}),
}
