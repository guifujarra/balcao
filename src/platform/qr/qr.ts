export async function makeQr(value: string, label?: string): Promise<string> {
  const qr = await import('qrcode')
  const canvas = document.createElement('canvas')
  await qr.toCanvas(canvas, value, { width: 1024, margin: 4, errorCorrectionLevel: 'M' })
  if (!label) return canvas.toDataURL('image/png')
  const image = document.createElement('canvas')
  image.width = 1024
  image.height = 1184
  const context = image.getContext('2d')
  if (!context) throw new Error('Não foi possível gerar a imagem.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, image.width, image.height)
  context.drawImage(canvas, 0, 0)
  context.fillStyle = '#172e29'
  context.textAlign = 'center'
  context.font = 'bold 36px sans-serif'
  context.fillText(label, 512, 1072, 928)
  context.font = '24px sans-serif'
  context.fillText('Balcão · Código para leitura no aplicativo', 512, 1134, 928)
  return image.toDataURL('image/png')
}
