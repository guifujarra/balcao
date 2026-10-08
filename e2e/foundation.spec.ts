import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('balcao-preview', 'ready'))
})

for (const width of [320, 390, 430, 768, 1440]) {
  test(`navegação e acessibilidade em ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    for (const [path, heading] of [
      ['/', 'Sua loja, em ordem.'],
      ['/mais', 'Um espaço para cada coisa.'],
      ['/configuracoes', 'Do seu jeito.'],
      ['/dev/ui-kit', 'Consistência em cada detalhe.'],
    ]) {
      await page.goto(path ?? '/')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading ?? '')
      if (path === '/') await expect(page.getByText('23 vendas realizadas')).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
      const audit = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      expect(audit.violations).toEqual([])
      await page.screenshot({
        path: testInfo.outputPath(
          `${path === '/' ? 'inicio' : path?.replaceAll('/', '-')}-${width}.png`,
        ),
        fullPage: true,
      })
    }
    await page.getByRole('navigation').getByRole('link', { name: 'Estoque', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cada produto, no seu lugar.')
    expect(errors).toEqual([])
  })
}

test('modal contém o foco, fecha com Escape e restaura o acionador', async ({ page }) => {
  await page.goto('/dev/ui-kit')
  const trigger = page.getByRole('button', { name: 'Abrir modal', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Editar exemplo' })
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

test('bottom sheet, estados e scanner manual permanecem acessíveis', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dev/ui-kit')
  await page.getByRole('button', { name: 'Abrir ações rápidas' }).click()
  await expect(page.getByRole('dialog', { name: 'O que você quer fazer?' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('bottom-sheet.png') })
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
  await page.getByRole('button', { name: 'Fechar janela' }).click()
  await page.getByRole('button', { name: 'Visualizar scanner' }).click()
  await page.getByRole('button', { name: 'Simular câmera indisponível' }).click()
  await page.getByRole('button', { name: 'Digitar código', exact: true }).click()
  await page.getByRole('textbox', { name: 'Código de barras ou QR' }).fill('7891234567890')
  await page.getByRole('button', { name: 'Confirmar código de exemplo' }).click()
  await expect(
    page.getByText('Código de exemplo recebido. Nenhuma consulta foi feita.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Dispensar notificação' }).click()
  await page.getByRole('tab', { name: 'Estados e feedback' }).click()
  for (const state of ['Vazio', 'Carregando', 'Erro', 'Sucesso']) {
    await page.getByRole('tab', { name: state, exact: true }).click()
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`estado-${state}.png`), fullPage: true })
  }
})

test('tema escuro persiste após reabrir e respeita contraste', async ({ page }, testInfo) => {
  await page.goto('/configuracoes')
  await page.getByRole('radio', { name: /Escuro/ }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.getByRole('radio', { name: /Escuro/ })).toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  for (const path of ['/', '/dev/ui-kit', '/configuracoes']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.screenshot({
      path: testInfo.outputPath(`dark-${path.replaceAll('/', '-') || 'inicio'}.png`),
      fullPage: true,
    })
  }
})
