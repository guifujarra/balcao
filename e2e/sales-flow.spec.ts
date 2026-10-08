import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'

test('cadastro contextual, QR exportável, carrinho persistente e tela de vendas limpa', async ({
  page,
}) => {
  await page.goto('/estoque?acao=novo')
  await expect(page.getByRole('dialog', { name: 'Adicionar produto' })).toBeVisible()
  await page.getByRole('button', { name: 'Ler código de barras', exact: true }).click()
  await expect(page).toHaveURL(/modo=cadastro/)
  await page.getByRole('button', { name: 'Digitar código', exact: true }).click()
  await page.getByLabel('Código de barras ou QR').fill('789020')
  await page.getByRole('button', { name: 'Consultar código' }).click()
  await expect(page.getByLabel('Código de barras', { exact: true })).toHaveValue('789020')
  await page.getByLabel('Nome do produto').fill('Produto com código')
  await page.getByLabel('Preço de venda (R$)').fill('10')
  await page.getByLabel('Estoque inicial').fill('5')
  await page.getByRole('button', { name: 'Salvar produto' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Novo produto', exact: true }).click()
  await page.getByRole('button', { name: 'Criar produto customizado', exact: true }).click()
  await page.getByLabel('Nome do produto').fill('Doce artesanal')
  await page.getByLabel('Preço de venda (R$)').fill('5')
  await page.getByLabel('Estoque inicial').fill('5')
  await page.getByRole('button', { name: 'Salvar produto' }).click()
  const qr = page.getByRole('img', { name: 'QR do produto Doce artesanal' })
  await expect(qr).toBeVisible()
  const pendingDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar PNG', exact: true }).click()
  const download = await pendingDownload
  const png = await readFile((await download.path())!)
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(png.readUInt32BE(16)).toBe(1024)
  expect(png.readUInt32BE(20)).toBe(1184)
  const id = download
    .suggestedFilename()
    .replace(/^balcao-produto-/, '')
    .replace(/\.png$/, '')
  expect(id).toMatch(/^[0-9a-f-]{36}$/)
  await page.getByRole('button', { name: 'Fechar janela' }).click()
  await page.goto('/vendas')
  await expect(page.getByRole('button', { name: 'Nova venda' })).toHaveCount(0)
  await expect(page.getByRole('searchbox')).toHaveCount(0)
  await expect(page.getByText('Produto com código', { exact: true })).toHaveCount(0)
  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'Escanear', exact: true }),
  ).toHaveCount(0)
  await page.goto('/escanear?modo=venda')
  await page.getByLabel('Código de barras ou QR').fill('789020')
  await page.getByRole('button', { name: 'Adicionar à venda', exact: true }).click()
  await expect(
    page.getByText('Produto com código adicionado à venda.', { exact: true }),
  ).toBeVisible()
  await page.getByLabel('Código de barras ou QR').fill('app:v1:produto:' + id)
  await page.getByRole('button', { name: 'Adicionar à venda', exact: true }).click()
  await expect(page.getByText('Doce artesanal adicionado à venda.', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Vendas', exact: true })).toHaveAccessibleDescription(
    'Venda em andamento: 2 produtos no carrinho',
  )
  await page.getByRole('button', { name: /Ver carrinho/ }).click()
  await expect(page.getByRole('heading', { name: 'Sua venda.' })).toBeVisible()
  await page.goto('/clientes')
  await expect(page.locator('.cart-badge')).toHaveText('2')
  await page.reload()
  await expect(page.locator('.cart-badge')).toHaveText('2')
  await page.goto('/vendas')
  await expect(
    page.getByRole('textbox', { name: 'Quantidade de Doce artesanal', exact: true }),
  ).toHaveValue('1')
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
  await page.getByRole('button', { name: 'Revisar e finalizar' }).click()
  await page.getByRole('button', { name: 'Finalizar venda', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Venda concluída' })).toContainText('15,00')
  await expect(page.locator('.cart-badge')).toHaveCount(0)
})

test('câmera contínua lê o PNG exportado, evita duplicatas e libera os recursos ao sair', async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(
    browserName !== 'chromium',
    'O vídeo sintético usa canvas.captureStream; o fluxo manual e QR são verificados nos dois motores.',
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    const testWindow = window as unknown as {
      balcaoCamera: {
        draw: (png: string) => Promise<void>
        track: MediaStreamTrack
        vibrations: number[]
      }
    }
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const context = canvas.getContext('2d')!
    context.fillStyle = '#fff'
    context.fillRect(0, 0, 640, 480)
    const stream = canvas.captureStream(12)
    let currentImage: HTMLImageElement | null = null
    setInterval(() => {
      context.fillStyle = '#fff'
      context.fillRect(0, 0, 640, 480)
      if (currentImage) context.drawImage(currentImage, 240, 120, 160, 185)
    }, 80)
    testWindow.balcaoCamera = {
      track: stream.getVideoTracks()[0]!,
      vibrations: [],
      async draw(png: string) {
        context.fillStyle = '#fff'
        context.fillRect(0, 0, 640, 480)
        currentImage = null
        if (!png) return
        const image = new Image()
        image.src = png
        await image.decode()
        currentImage = image
        context.drawImage(image, 240, 120, 160, 185)
      },
    }
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async () => stream,
    })
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (duration: number) => {
        testWindow.balcaoCamera.vibrations.push(duration)
        return true
      },
    })
  })
  await page.goto('/estoque?acao=novo')
  await page.getByRole('button', { name: 'Criar produto customizado', exact: true }).click()
  await page.getByLabel('Nome do produto').fill('QR de câmera')
  await page.getByLabel('Preço de venda (R$)').fill('7')
  await page.getByLabel('Estoque inicial').fill('5')
  await page.getByRole('button', { name: 'Salvar produto' }).click()
  const image = page.getByRole('img', { name: 'QR do produto QR de câmera' })
  await expect(image).toBeVisible()
  const png = (await image.getAttribute('src'))!
  await page.getByRole('button', { name: 'Fechar janela' }).click()
  await page.getByRole('navigation').getByRole('link', { name: 'Vendas', exact: true }).click()
  await page.getByRole('button', { name: 'Escanear produtos', exact: true }).click()
  const video = page.locator('#balcao-camera video')
  await expect(video).toBeVisible()
  const camera = page.getByRole('dialog', { name: 'Escanear produtos' })
  await expect(camera).toBeVisible()
  const bounds = (await camera.boundingBox())!
  expect(bounds.width).toBe(390)
  expect(bounds.height).toBe(844)
  await expect(page.locator('.camera-aim')).toBeVisible()
  await expect(page.getByRole('navigation')).not.toBeVisible()
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
  const vibrationsBefore = await page.evaluate(
    () =>
      (window as unknown as { balcaoCamera: { vibrations: number[] } }).balcaoCamera.vibrations
        .length,
  )
  await page.evaluate(
    async (data) =>
      (
        window as unknown as { balcaoCamera: { draw: (png: string) => Promise<void> } }
      ).balcaoCamera.draw(data),
    png,
  )
  await expect(page.getByText('QR de câmera adicionado à venda.', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  await expect(video).toBeVisible()
  await expect(page.getByRole('button', { name: /Ver carrinho · 1 produto/ })).toContainText('7,00')
  await page.screenshot({ path: testInfo.outputPath('scanner-confirmacao.png') })
  // Espere o aviso sumir: o mesmo QR continua diante da câmera e não deve contar outra vez.
  await expect(page.getByText('QR de câmera adicionado à venda.', { exact: true })).toHaveCount(0, {
    timeout: 5000,
  })
  await expect(page.getByRole('button', { name: /Ver carrinho/ })).toContainText('7,00')
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { balcaoCamera: { vibrations: number[] } }).balcaoCamera.vibrations
          .length,
    ),
  ).toBe(vibrationsBefore + 1)
  await page.evaluate(() =>
    (
      window as unknown as { balcaoCamera: { draw: (png: string) => Promise<void> } }
    ).balcaoCamera.draw(''),
  )
  await page.waitForTimeout(1600)
  await page.evaluate(
    async (data) =>
      (
        window as unknown as { balcaoCamera: { draw: (png: string) => Promise<void> } }
      ).balcaoCamera.draw(data),
    png,
  )
  await expect(page.getByText('QR de câmera adicionado à venda.', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  await expect(page.getByRole('button', { name: /Ver carrinho/ })).toContainText('14,00')
  await page.getByRole('button', { name: /Ver carrinho/ }).click()
  await expect(
    page.getByRole('textbox', { name: 'Quantidade de QR de câmera', exact: true }),
  ).toHaveValue('2')
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { balcaoCamera: { track: MediaStreamTrack } }).balcaoCamera.track
          .readyState,
    ),
  ).toBe('ended')
  await page.screenshot({ path: testInfo.outputPath('carrinho.png'), fullPage: true })
})
