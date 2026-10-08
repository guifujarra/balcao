import { test, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
test('cache e SQLite persistem com servidor desligado e página reaberta', async ({
  page,
  context,
  browserName,
}) => {
  const root = resolve('dist')
  const mime: Record<string, string> = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.wasm': 'application/wasm',
    '.svg': 'image/svg+xml',
    '.html': 'text/html',
    '.webmanifest': 'application/manifest+json',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  }
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
    const path = resolve(root, '.' + pathname)
    if (!path.startsWith(root + sep) && path !== root) {
      response.writeHead(403).end()
      return
    }
    const file = extname(path) ? path : resolve(root, 'index.html')
    void readFile(file).then(
      (bytes) => {
        response.writeHead(200, {
          'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
          Vary: 'Origin',
        })
        response.end(bytes)
      },
      () => response.writeHead(404).end(),
    )
  })
  await new Promise<void>((ready) => server.listen(0, '127.0.0.1', ready))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Servidor de teste não iniciou.')
  const origin = 'http://127.0.0.1:' + address.port
  const stop = () =>
    new Promise<void>((done, reject) => {
      if (!server.listening) {
        done()
        return
      }
      server.close((error) => (error ? reject(error) : done()))
      server.closeAllConnections()
    })
  try {
    await page.goto(origin + '/estoque')
    await expect(page.getByText('Seu estoque começa aqui')).toBeVisible()
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await page.reload()
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
    await stop()
    // WebKit 1.63 falha no próprio setOffline para navegação SW (Playwright #42775).
    // Desligar o servidor verifica indisponibilidade real da origem nos dois motores.
    if (browserName === 'chromium') await context.setOffline(true)
    const response = await page.reload()
    expect(response?.fromServiceWorker()).toBe(true)
    await page.getByRole('button', { name: 'Novo produto', exact: true }).click()
    await page.getByRole('button', { name: 'Criar produto customizado', exact: true }).click()
    await page
      .getByRole('textbox', { name: 'Nome do produto', exact: true })
      .fill('Produto offline')
    await page.getByRole('textbox', { name: 'Preço de venda (R$)', exact: true }).fill('12')
    await page.getByRole('textbox', { name: 'Estoque inicial', exact: true }).fill('3')
    await page.getByRole('button', { name: 'Salvar produto' }).click()
    await expect(page.getByRole('dialog', { name: 'Produto offline', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Fechar janela' }).click()
    await expect(page.getByText('Produto offline', { exact: true })).toBeVisible()
    await page.close()
    const reopened = await context.newPage()
    await reopened.goto(origin + '/estoque')
    await expect(reopened.getByText('Produto offline', { exact: true })).toBeVisible()
  } finally {
    await context.setOffline(false)
    await stop()
  }
})
