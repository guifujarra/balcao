import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('balcao-preview', 'ready'))
})

test('Home: atalhos, indicadores, alertas e contexto de produto', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('23 vendas realizadas')).toBeVisible()
  await expect(page.getByText('Mercearia da Esquina')).toBeVisible()
  for (const [action, path] of [
    ['Vender.*Começar', '/escanear?modo=venda&auto=1'],
    ['Produto.*Adicionar', '/estoque?acao=novo'],
    ['Combo.*Combinar', '/combos?acao=novo'],
  ]) {
    await page.getByRole('button', { name: new RegExp(action ?? '') }).click()
    await expect(page).toHaveURL(`http://127.0.0.1:4173${path}`)
    await page.getByRole('navigation').getByRole('link', { name: 'Início', exact: true }).click()
    await expect(page.getByText('23 vendas realizadas')).toBeVisible()
  }
  await page.getByRole('button', { name: /Estoque baixo.*Produtos para repor/ }).click()
  await expect(page).toHaveURL(/filtro=baixo$/)
  await page.goBack()
  await page.getByRole('button', { name: /Café especial, Mercearia/ }).click()
  await expect(page).toHaveURL(/produto=572504be-/)
})

for (const width of [320, 390, 430, 768]) {
  test(`Home: estados e acessibilidade em ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    for (const [scenario, text] of [
      ['ready', '23 vendas realizadas'],
      ['empty', 'Sua loja começa pelo primeiro produto'],
      ['loading', 'Preparando o resumo da loja…'],
      ['retry', 'Não conseguimos abrir o resumo'],
    ]) {
      await page.goto(`/?preview=${scenario}`)
      await expect(page.getByText(text ?? '', { exact: true })).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([])
      await page.screenshot({
        path: testInfo.outputPath(`home-${scenario}-${width}.png`),
        fullPage: true,
      })
      if (scenario === 'retry') {
        await page.getByRole('button', { name: 'Tentar novamente' }).click()
        await expect(page.getByText('23 vendas realizadas')).toBeVisible()
      }
    }
  })
}
