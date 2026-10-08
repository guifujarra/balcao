import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
test('fluxo completo: estoque, scanner, combo, venda, compra e caixa', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000)
  await page.goto('/estoque')
  await expect(page.getByText('Seu estoque começa aqui')).toBeVisible()
  await page.getByRole('button', { name: 'Novo produto', exact: true }).click()
  await page.getByRole('button', { name: 'Criar produto customizado', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Novo produto', exact: true })
  await dialog.getByLabel('Nome do produto').fill('Café operacional')
  await dialog.getByLabel('Preço de venda (R$)').fill('18,90')
  await dialog.getByLabel('Código de barras').fill('789001')
  await dialog.getByLabel('SKU', { exact: true }).fill('CAF-OP')
  await dialog.getByLabel('Estoque inicial').fill('10')
  await dialog.getByLabel('Ou criar categoria').fill('Mercearia')
  await dialog.getByRole('button', { name: 'Salvar produto' }).click()
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'Fechar janela' }).click()
  await page.reload()
  await expect(page.getByText('Café operacional', { exact: true })).toBeVisible()
  await page.getByLabel('Buscar produto').fill('789001')
  await page.getByRole('button', { name: 'Ver Café operacional' }).click()
  await expect(page.getByRole('dialog')).toContainText('10 un')
  await page.getByRole('button', { name: 'Editar produto', exact: true }).click()
  await page.getByLabel('Nome do produto').fill('Café atualizado')
  await page.getByRole('button', { name: 'Salvar produto' }).click()
  await expect(page.getByText('Café atualizado', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Ver Café atualizado' }).click()
  await page.getByRole('button', { name: 'Movimentar estoque' }).click()
  await page.getByLabel('Tipo de movimento').selectOption('OUT')
  await page.getByRole('textbox', { name: 'Quantidade', exact: true }).fill('11')
  await page.getByRole('textbox', { name: 'Motivo', exact: true }).fill('Perda')
  await page.getByRole('button', { name: 'Registrar movimento' }).click()
  await expect(page.getByRole('dialog')).toContainText('Estoque insuficiente')
  await page.getByRole('textbox', { name: 'Quantidade', exact: true }).fill('2')
  await page.getByRole('button', { name: 'Registrar movimento' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Ver Café atualizado' }).click()
  await expect(page.getByRole('dialog')).toContainText('8 un')
  await expect(page.getByRole('dialog')).toContainText('Perda')
  await page.screenshot({ path: testInfo.outputPath('produto-persistido.png'), fullPage: true })
  await page.getByRole('button', { name: 'Fechar janela' }).click()
  await page.goto('/escanear')
  await page.getByRole('textbox', { name: 'Código de barras ou QR', exact: true }).fill('789001')
  await page.getByRole('button', { name: 'Consultar código' }).click()
  await expect(page.getByRole('heading', { name: 'Produto encontrado' })).toBeVisible()
  await expect(page.getByText('8 un disponíveis')).toBeVisible()
  await page.getByRole('textbox', { name: 'Código de barras ou QR', exact: true }).fill('99999')
  await page.getByRole('button', { name: 'Consultar código' }).click()
  await page.getByRole('button', { name: 'Cadastrar com este código' }).click()
  await expect(page.getByRole('textbox', { name: 'Código de barras', exact: true })).toHaveValue(
    '99999',
  )
  await page.goto('/combos')
  await page.getByRole('button', { name: 'Novo combo', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nome do combo', exact: true }).fill('Dupla de café')
  await page.getByRole('textbox', { name: 'Preço de referência (R$)', exact: true }).fill('35')
  await page.getByRole('combobox', { name: 'Produto 1' }).selectOption({ label: 'Café atualizado' })
  await page.getByRole('textbox', { name: 'Quantidade 1', exact: true }).fill('2')
  await page.getByRole('button', { name: 'Salvar combo' }).click()
  await page.getByRole('button', { name: 'Ver combo Dupla de café' }).click()
  await expect(page.getByRole('img', { name: 'QR do combo Dupla de café' })).toBeVisible()
  const comboDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar PNG', exact: true }).click()
  expect((await comboDownload).suggestedFilename()).toMatch(/^balcao-combo-.*\.png$/)
  await page.getByRole('button', { name: 'Movimentar combo', exact: true }).click()
  await page.getByRole('textbox', { name: 'Número de combos', exact: true }).fill('5')
  await page.getByRole('textbox', { name: 'Motivo do combo', exact: true }).fill('Entrega de kits')
  await page.getByRole('button', { name: 'Confirmar movimentação' }).click()
  await expect(page.getByRole('dialog')).toContainText('Estoque insuficiente')
  await page.getByRole('textbox', { name: 'Número de combos', exact: true }).fill('2')
  await page.getByRole('button', { name: 'Confirmar movimentação' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.goto('/estoque')
  await page.getByRole('button', { name: 'Ver Café atualizado' }).click()
  await expect(page.getByRole('dialog')).toContainText('4 un')
  await expect(page.getByRole('dialog')).toContainText('Entrega de kits')
  await page.goto('/escanear?modo=venda')
  await page.getByLabel('Código de barras ou QR').fill('789001')
  await page.getByRole('button', { name: 'Adicionar à venda', exact: true }).click()
  await page.getByRole('button', { name: /Ver carrinho/ }).click()
  await page.getByRole('textbox', { name: 'Quantidade de Café atualizado', exact: true }).fill('2')
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click()
  await page.getByRole('button', { name: 'Escanear produtos' }).click()
  await page.getByRole('navigation').getByRole('link', { name: 'Vendas', exact: true }).click()
  await page.reload()
  await expect(
    page.getByRole('textbox', { name: 'Quantidade de Café atualizado', exact: true }),
  ).toHaveValue('2')
  await page.getByRole('button', { name: 'Revisar e finalizar' }).click()
  await page.getByRole('textbox', { name: 'Desconto (R$)', exact: true }).fill('1,80')
  await page.getByLabel('Forma de pagamento').selectOption('PIX')
  await page.getByRole('button', { name: 'Finalizar venda', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Venda concluída' })).toContainText('36,00')
  await page.getByRole('button', { name: 'Concluir', exact: true }).click()
  await page.goto('/estoque')
  await page.getByRole('button', { name: 'Ver Café atualizado' }).click()
  await expect(page.getByRole('dialog')).toContainText('2 un')
  await page.goto('/')
  await expect(page.getByText('1 venda realizada', { exact: true })).toBeVisible()
  await expect(page.getByText('R$ 36,00', { exact: true })).toBeVisible()
  await page.goto('/fornecedores')
  await page.getByRole('button', { name: 'Novo fornecedor', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Distribuidora local')
  await page.getByRole('textbox', { name: 'Telefone', exact: true }).fill('11999990000')
  await page.getByRole('button', { name: 'Salvar cadastro' }).click()
  await expect(page.getByText('Distribuidora local', { exact: true })).toBeVisible()
  await page.goto('/clientes')
  await page.getByRole('button', { name: 'Novo cliente', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Cliente local')
  await page.getByRole('button', { name: 'Salvar cadastro' }).click()
  await expect(page.getByText('Cliente local', { exact: true })).toBeVisible()
  await page.goto('/compras')
  await page.getByRole('button', { name: 'Receber compra', exact: true }).click()
  await page.getByLabel('Fornecedor (opcional)').selectOption({ label: 'Distribuidora local' })
  await page.getByRole('combobox', { name: 'Produto 1' }).selectOption({ label: 'Café atualizado' })
  await page.getByRole('textbox', { name: 'Quantidade 1', exact: true }).fill('10')
  await page.getByRole('textbox', { name: 'Custo unitário 1 (R$)', exact: true }).fill('2,50')
  await page.getByRole('button', { name: 'Confirmar recebimento' }).click()
  await expect(page.getByText('R$ 25,00', { exact: true })).toBeVisible()
  await page.goto('/estoque')
  await page.getByRole('button', { name: 'Ver Café atualizado' }).click()
  await expect(page.getByRole('dialog')).toContainText('12 un')
  await page.goto('/financeiro')
  await page.getByRole('button', { name: 'Abrir caixa', exact: true }).click()
  await page.getByRole('textbox', { name: 'Dinheiro inicial (R$)', exact: true }).fill('100')
  await page.getByRole('button', { name: 'Confirmar abertura' }).click()
  await page.getByRole('button', { name: 'Nova despesa', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Descrição da despesa', exact: true })
    .fill('Frete da compra')
  await page.getByRole('textbox', { name: 'Valor (R$)', exact: true }).fill('10')
  await page.getByRole('button', { name: 'Registrar despesa' }).click()
  await expect(page.getByText('R$ 90,00', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar caixa', exact: true }).click()
  await page.getByRole('textbox', { name: 'Dinheiro contado (R$)', exact: true }).fill('90')
  await page.getByRole('button', { name: 'Confirmar fechamento' }).click()
  await expect(page.getByText('Esperado: R$ 90,00 · Contado: R$ 90,00')).toBeVisible()
  await page.goto('/relatorios')
  await expect(page.getByText('1 vendas concluídas')).toBeVisible()
  await expect(page.getByText('Produtos com maior receita')).toBeVisible()
  for (const path of [
    '/',
    '/estoque',
    '/combos',
    '/vendas',
    '/compras',
    '/financeiro',
    '/relatorios',
  ]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Abrindo os dados da loja…')).toHaveCount(0)
    await page.evaluate(() => document.fonts.ready)
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.screenshot({
      path: testInfo.outputPath('operacional-' + (path.replaceAll('/', '') || 'home') + '.png'),
      fullPage: true,
    })
  }
  await page.goto('/configuracoes')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar backup' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^balcao-backup-.*\.json$/)
  await page.getByRole('radio', { name: /Escuro/ }).check()
  await page.goto('/vendas')
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('vendas-escuro.png'), fullPage: true })
})
for (const width of [320, 390, 430, 768]) {
  test(`cadastro responsivo e acessível em ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/estoque')
    await expect(page.getByText('Seu estoque começa aqui')).toBeVisible()
    await page.getByRole('button', { name: 'Novo produto', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Criar produto customizado', exact: true }).click()
    await page.evaluate(() => document.fonts.ready)
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`cadastro-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Fechar janela' }).click()
    for (const path of [
      '/escanear',
      '/combos',
      '/vendas',
      '/compras',
      '/clientes',
      '/fornecedores',
      '/financeiro',
      '/relatorios',
      '/configuracoes',
    ]) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByText('Abrindo os dados da loja…')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([])
      await page.screenshot({
        path: testInfo.outputPath(path.slice(1) + '-' + width + '.png'),
        fullPage: true,
      })
    }
  })
}
