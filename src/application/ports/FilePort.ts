export type ImageExportResult = 'shared' | 'downloaded' | 'cancelled'
export interface FilePort {
  save(name: string, type: string, contents: string): Promise<void>
  shareImage(name: string, dataUrl: string, title: string): Promise<ImageExportResult>
  downloadImage?: (name: string, dataUrl: string) => Promise<void>
}
