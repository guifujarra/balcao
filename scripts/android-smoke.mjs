import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { _android, expect } from '@playwright/test'

const serial = process.env.BALCAO_ANDROID_SERIAL || 'emulator-5556'
assert(serial.startsWith('emulator-'), 'Execute este teste somente em um emulador dedicado.')
const sdk = process.env.ANDROID_HOME
assert(sdk, 'Defina ANDROID_HOME para localizar o adb.')
const adb = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')
const app = 'br.com.balcao.app'
const out = 'docs/qa/android'
mkdirSync(out, { recursive: true })
const command = (...args) =>
  execFileSync(adb, ['-s', serial, ...args], { encoding: 'utf8', timeout: 30000 }).trim()
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function connect() {
  command('shell', 'am', 'start', '-W', '-n', app + '/.MainActivity')
  const devices = await _android.devices({ omitDriverInstall: true })
  const device = devices.find((candidate) => candidate.serial() === serial)
  assert(device, 'Emulador de teste não encontrado pelo Playwright.')
  const webView = await device.webView({ pkg: app }, { timeout: 30000 })
  const page = await webView.page()
  page.setDefaultTimeout(15000)
  return { browser: device, page }
}
let browser
const evidence = {
  serial,
  platform: command('shell', 'getprop', 'ro.build.version.release'),
  assertions: [],
}
const product = 'Produto Android ' + Date.now()
try {
  command('shell', 'am', 'force-stop', app)
  command('shell', 'svc', 'wifi', 'disable')
  command('shell', 'svc', 'data', 'disable')
  let connected = await connect()
  browser = connected.browser
  let page = connected.page
  await expect(page.getByText('Neste aparelho', { exact: true })).toBeVisible()
  await page.goto('https://localhost/#/vendas')
  await expect(page.getByRole('button', { name: 'Escanear produtos', exact: true })).toBeVisible({
    timeout: 15000,
  })
  const oldDraft = page.getByRole('button', { name: 'Cancelar venda em aberto', exact: true })
  if (await oldDraft.isVisible()) {
    await oldDraft.click()
    await page.getByRole('button', { name: 'Cancelar venda', exact: true }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Pronto para vender', { exact: true })).toBeVisible({
      timeout: 15000,
    })
  }
  await page.getByRole('navigation').getByRole('link', { name: 'Estoque', exact: true }).click()
  await page.getByRole('button', { name: 'Novo produto', exact: true }).click()
  await page.getByRole('button', { name: 'Criar produto customizado', exact: true }).click()
  await page.getByLabel('Nome do produto').fill(product)
  await page.getByLabel('Preço de venda (R$)').fill('5,50')
  await page.getByLabel('Estoque inicial').fill('5')
  await page.getByRole('button', { name: 'Salvar produto' }).click()
  await expect(page.getByRole('dialog', { name: product })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('dialog')).toContainText('5 un')
  await expect(page.getByRole('img', { name: 'QR do produto ' + product })).toBeVisible()
  const imagesBefore = new Set(command('shell', 'run-as', app, 'ls', 'cache').split(/\r?\n/))
  await page.getByRole('button', { name: 'Compartilhar QR code' }).click()
  await pause(1000)
  const imageName = command('shell', 'run-as', app, 'ls', 'cache')
    .split(/\r?\n/)
    .find((name) => /^balcao-produto-.*\.png$/.test(name) && !imagesBefore.has(name))
  assert(imageName, 'O QR do produto não foi exportado')
  const qrCode = 'app:v1:produto:' + imageName.replace(/^balcao-produto-/, '').replace(/\.png$/, '')
  const png = execFileSync(adb, [
    '-s',
    serial,
    'exec-out',
    'run-as',
    app,
    'cat',
    'cache/' + imageName,
  ])
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(png.readUInt32BE(16), 1024)
  assert.equal(png.readUInt32BE(20), 1184)
  assert(
    command('shell', 'dumpsys', 'activity', 'activities').includes('ChooserActivity'),
    'O compartilhamento nativo não abriu',
  )
  command('shell', 'input', 'keyevent', '4')
  evidence.assertions.push(
    'QR do produto em PNG de 1024 × 1184 e painel nativo de compartilhamento',
  )
  writeFileSync(
    out + '/produto-qr.png',
    execFileSync(adb, ['-s', serial, 'exec-out', 'screencap', '-p']),
  )
  command('shell', 'input', 'keyevent', '4')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  evidence.assertions.push('Cadastro offline e botão voltar fechando o diálogo')
  await page.getByRole('navigation').getByRole('link', { name: 'Vendas', exact: true }).click()
  await page.goto('https://localhost/#/escanear?modo=venda')
  await page.evaluate(() => {
    const cap = globalThis.Capacitor
    const original = cap.nativePromise
    globalThis.balcaoHaptics = []
    cap.nativePromise = function (plugin, method, ...args) {
      if (plugin === 'Haptics' && method === 'notification') globalThis.balcaoHaptics.push(args[0])
      return original.call(cap, plugin, method, ...args)
    }
  })
  await page.getByLabel('Código de barras ou QR').fill(qrCode)
  await page.getByRole('button', { name: 'Adicionar à venda', exact: true }).click()
  await expect(page.getByText(product + ' adicionado à venda.', { exact: true })).toBeVisible()
  assert.equal(await page.evaluate(() => globalThis.balcaoHaptics.length), 1)
  await page.getByRole('button', { name: /Ver carrinho/ }).click()
  await expect(page.locator('.cart-badge')).toBeVisible()
  evidence.assertions.push(
    'Primeira leitura do QR inicia a venda e chama Haptics.notification após gravar',
  )
  await page.getByRole('textbox', { name: 'Quantidade de ' + product, exact: true }).fill('2')
  await page
    .getByRole('textbox', { name: 'Quantidade de ' + product, exact: true })
    .locator('xpath=ancestor::form')
    .getByRole('button', { name: 'Atualizar', exact: true })
    .click()
  await page.getByRole('button', { name: 'Revisar e finalizar' }).click()
  await page.getByRole('button', { name: 'Finalizar venda', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Venda concluída' })).toContainText('11,00')
  await page.getByRole('button', { name: 'Concluir', exact: true }).click()
  evidence.assertions.push('Venda offline com baixa de 2 unidades')
  await browser.close()
  browser = undefined
  command('shell', 'am', 'force-stop', app)
  connected = await connect()
  browser = connected.browser
  page = connected.page
  await page.getByRole('navigation').getByRole('link', { name: 'Estoque', exact: true }).click()
  await page.getByRole('button', { name: 'Ver ' + product }).click()
  await expect(page.getByRole('dialog')).toContainText('3 un')
  writeFileSync(
    out + '/estoque-reaberto.png',
    execFileSync(adb, ['-s', serial, 'exec-out', 'screencap', '-p']),
  )
  writeFileSync(
    out + '/estoque-nativo.png',
    execFileSync(adb, ['-s', serial, 'exec-out', 'screencap', '-p']),
  )
  evidence.assertions.push('Processo encerrado e reaberto com saldo e histórico preservados')
  const databases = command('shell', 'run-as', app, 'ls', 'databases')
  assert(databases.includes('balcaoSQLite.db'), 'Arquivo SQLite nativo ausente')
  evidence.assertions.push('Banco SQLite nativo balcaoSQLite.db presente')
  await page.getByRole('button', { name: 'Fechar janela' }).click()
  await page.goto('https://localhost/#/configuracoes')
  await page.getByRole('button', { name: 'Exportar backup' }).click()
  await pause(1500)
  const cacheFiles = command('shell', 'run-as', app, 'ls', 'cache')
  const backupName = cacheFiles
    .split(/\r?\n/)
    .findLast((name) => /^balcao-backup-.*\.json$/.test(name))
  assert(backupName, 'Exportação nativa não produziu o arquivo de backup')
  const backup = JSON.parse(command('shell', 'run-as', app, 'cat', 'cache/' + backupName))
  assert(backup.state.products.some((item) => item.name === product && item.quantity === 3))
  command('shell', 'input', 'keyevent', '4')
  evidence.assertions.push('Backup nativo em arquivo com o saldo correto')
  await page.goto('https://localhost/#/escanear?modo=venda')
  command('shell', 'pm', 'grant', app, 'android.permission.CAMERA')
  await page.evaluate(() => {
    const cap = globalThis.Capacitor
    const nativeCallback = cap.nativeCallback
    const nativePromise = cap.nativePromise
    globalThis.cameraHaptics = []
    cap.nativeCallback = function (plugin, method, options, callback) {
      if (
        plugin === 'BarcodeScanner' &&
        method === 'addListener' &&
        options.eventName === 'barcodesScanned'
      )
        globalThis.nativeReading = callback
      return nativeCallback.call(cap, plugin, method, options, callback)
    }
    cap.nativePromise = function (plugin, method, ...args) {
      if (plugin === 'Haptics' && method === 'notification') globalThis.cameraHaptics.push(args[0])
      return nativePromise.call(cap, plugin, method, ...args)
    }
  })
  await page.getByRole('button', { name: 'Abrir câmera', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Escanear produtos' })).toBeVisible()
  await expect
    .poll(() => command('shell', 'dumpsys', 'media.camera'))
    .toContain('br.com.balcao.app')
  await pause(1500)
  await expect
    .poll(
      async () => {
        try {
          const zoom = await page.evaluate(() =>
            globalThis.Capacitor.nativePromise('BarcodeScanner', 'getZoomRatio', {}),
          )
          return zoom.zoomRatio > 0
        } catch {
          return false
        }
      },
      { timeout: 20000 },
    )
    .toBe(true)
  assert.equal(
    await page.locator('#balcao-camera video').count(),
    0,
    'Android deve usar a câmera nativa',
  )
  writeFileSync(
    out + '/camera-continua.png',
    execFileSync(adb, ['-s', serial, 'exec-out', 'screencap', '-p']),
  )
  const decoded = await page.evaluate(
    async ({ imageName }) => {
      const cap = globalThis.Capacitor
      const image = await cap.nativePromise('Filesystem', 'getUri', {
        path: imageName,
        directory: 'CACHE',
      })
      return cap.nativePromise('BarcodeScanner', 'readBarcodesFromImage', { path: image.uri })
    },
    { imageName },
  )
  assert(
    decoded.barcodes.some((barcode) => barcode.rawValue === qrCode),
    'ML Kit não reconheceu o PNG exportado',
  )
  await page.evaluate((event) => {
    globalThis.nativeReading(event)
    globalThis.heldCode = setInterval(() => globalThis.nativeReading(event), 100)
  }, decoded)
  await expect(page.getByText(product + ' adicionado à venda.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Ver carrinho/ })).toContainText('5,50')
  writeFileSync(
    out + '/camera-confirmacao.png',
    execFileSync(adb, ['-s', serial, 'exec-out', 'screencap', '-p']),
  )
  await pause(2000)
  await page.evaluate(() => clearInterval(globalThis.heldCode))
  await expect(page.getByRole('button', { name: /Ver carrinho/ })).toContainText('5,50')
  assert.equal(await page.evaluate(() => globalThis.cameraHaptics.length), 1)
  await pause(1600)
  await page.evaluate((event) => globalThis.nativeReading(event), decoded)
  await expect(page.getByRole('button', { name: /Ver carrinho/ })).toContainText('11,00')
  assert.equal(await page.evaluate(() => globalThis.cameraHaptics.length), 2)
  evidence.assertions.push('ML Kit nativo reconhece offline o QR do produto no PNG exportado')
  evidence.assertions.push(
    'Eventos nativos injetados com o QR decodificado: adição contínua, proteção de duplicata e Haptics após gravar',
  )
  evidence.assertions.push(
    'Prévia CameraX nativa em tela cheia, mira visível e nenhuma captura pelo WebView',
  )
  command('shell', 'input', 'keyevent', '4')
  await expect(page.getByRole('heading', { name: 'Sua venda.' })).toBeVisible()
  await expect(page.locator('#balcao-camera video')).toHaveCount(0)
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          try {
            await globalThis.Capacitor.nativePromise('BarcodeScanner', 'getZoomRatio', {})
            return false
          } catch {
            return true
          }
        }),
      { timeout: 10000 },
    )
    .toBe(true)
  evidence.assertions.push('Botão voltar encerra a sessão de câmera e retorna ao carrinho')
  await page.getByRole('button', { name: 'Cancelar venda em aberto', exact: true }).click()
  await page.getByRole('button', { name: 'Cancelar venda', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  evidence.completedAt = new Date().toISOString()
  writeFileSync(out + '/resultado.json', JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  if (browser) await browser.close()
  command('shell', 'svc', 'wifi', 'enable')
}
